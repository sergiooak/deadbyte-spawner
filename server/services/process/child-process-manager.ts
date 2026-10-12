import { access } from 'node:fs/promises'
import { join } from 'pathe'
import { eq } from 'drizzle-orm'
import { execa, execaCommand } from 'execa'
import { db } from '../../db/client.js'
import { instance, repository } from '../../db/schema/index.js'
import { readSpawnerEnv } from '../../utils/env.js'
import { InstanceService } from '../instances/instance.service.js'
import { InstanceRuntimeConfigService } from '../instances/instance-runtime-config.service.js'
import { ProcessLogService } from '../logs/process-log.service.js'
import { RuntimeEventService } from '../logs/runtime-event.service.js'
import { parseStdoutEvent } from '../logs/stdout-event-parser.js'
import type { ManagedProcess } from './process-manager.types.js'

// Segredos do spawner que os bots não precisam receber.
const SPAWNER_ONLY_ENV = /^(DATABASE_URL|DEADBYTE_ADMIN_PASSWORD|SERVICE_(PASSWORD|USER|BASE64)_.*)$/

const STOP_TIMEOUT_MS = 20_000
const RESTART_DELAY_MS = 15_000
const MAX_CRASH_RESTARTS = 5
// Um processo que ficou de pé por esse tempo zera o contador de crashes.
const STABLE_UPTIME_MS = 5 * 60_000

export class ChildProcessManager {
  private readonly processes = new Map<string, ManagedProcess>()
  private readonly crashCounts = new Map<string, number>()
  private readonly restartTimers = new Map<string, NodeJS.Timeout>()

  constructor(
    private readonly runtimeConfig = new InstanceRuntimeConfigService(),
    private readonly logs = new ProcessLogService(),
    private readonly events = new RuntimeEventService()
  ) { }

  isRunning(instanceSlug: string): boolean {
    return this.processes.has(instanceSlug)
  }

  runningSlugs(): string[] {
    return [...this.processes.keys()]
  }

  /**
   * @param options.persist grava autoStart=true para a instância voltar sozinha após um redeploy.
   */
  async start(instanceSlug: string, options: { persist?: boolean } = {}) {
    const env = readSpawnerEnv()
    const [row] = await db.select().from(instance).where(eq(instance.slug, instanceSlug)).limit(1)
    if (!row) {
      throw new Error(`Instance not found: ${instanceSlug}`)
    }

    this.clearRestartTimer(instanceSlug)
    if (this.processes.has(instanceSlug)) {
      return { ok: true, alreadyRunning: true }
    }

    const [repo] = await db.select().from(repository).where(eq(repository.slug, row.repositorySlug)).limit(1)
    if (!(await pathExists(join(row.repoPath, 'package.json')))) {
      throw new Error(`Repository ${row.repositorySlug} has not been synced yet. Run sync first.`)
    }

    await new InstanceService().ensureCommands(instanceSlug)
    await this.runtimeConfig.generate(instanceSlug)
    await db
      .update(instance)
      .set({
        status: 'starting',
        lastQr: null,
        startedAt: new Date(),
        updatedAt: new Date(),
        ...(options.persist === false ? {} : { autoStart: true })
      })
      .where(eq(instance.slug, instanceSlug))

    const startCommand = repo?.startCommand ?? 'node dist/cli/index.mjs start'
    const command = [
      // `exec` faz o sinal de stop chegar direto no processo do bot, não só no shell.
      process.platform === 'win32' ? '' : 'exec',
      startCommand,
      '--mode managed',
      `--instance-id ${row.slug}`,
      `--client-id ${row.clientId}`,
      `--session-path "${row.sessionPath}"`,
      `--runtime-config "${row.runtimeConfigPath}"`,
      '--internal-api true',
      `--internal-host ${row.internalHost}`,
      row.internalPort ? `--internal-port ${row.internalPort}` : ''
    ]
      .filter(Boolean)
      .join(' ')

    const child = execaCommand(command, {
      cwd: row.repoPath,
      env: {
        ...botEnvironment(),
        DEADBYTE_CHROME_PATH: env.DEADBYTE_CHROME_PATH || undefined,
        FFMPEG_PATH: env.FFMPEG_PATH || undefined,
        FFPROBE_PATH: env.FFPROBE_PATH || undefined
      },
      extendEnv: false,
      shell: true,
      all: false,
      reject: false
    })

    let resolveExited: () => void = () => undefined
    const managed: ManagedProcess = {
      instanceSlug,
      process: child,
      stdoutBuffer: '',
      stderrBuffer: '',
      startedAt: Date.now(),
      stopping: false,
      exited: new Promise<void>((resolve) => {
        resolveExited = resolve
      })
    }
    this.processes.set(instanceSlug, managed)

    child.stdout?.on('data', (chunk: Buffer) => {
      void this.handleChunk(managed, 'stdout', chunk.toString('utf8'))
    })
    child.stderr?.on('data', (chunk: Buffer) => {
      void this.handleChunk(managed, 'stderr', chunk.toString('utf8'))
    })
    child.on('exit', (code) => {
      if (this.processes.get(instanceSlug) === managed) {
        this.processes.delete(instanceSlug)
      }
      resolveExited()
      void this.handleExit(managed, code)
    })

    return { ok: true, pid: child.pid }
  }

  async stop(instanceSlug: string, options: { persist?: boolean } = {}) {
    this.clearRestartTimer(instanceSlug)
    this.crashCounts.delete(instanceSlug)
    const managed = this.processes.get(instanceSlug)
    await db
      .update(instance)
      .set({ status: 'stopping', updatedAt: new Date(), ...(options.persist === false ? {} : { autoStart: false }) })
      .where(eq(instance.slug, instanceSlug))

    if (managed) {
      managed.stopping = true
      terminate(managed, 'SIGTERM')
      const timedOut = await Promise.race([
        managed.exited.then(() => false),
        new Promise<boolean>((resolve) => setTimeout(() => resolve(true), STOP_TIMEOUT_MS))
      ])
      if (timedOut) {
        terminate(managed, 'SIGKILL')
        await managed.exited
      }
      this.processes.delete(instanceSlug)
    }

    await db.update(instance).set({ status: 'stopped', stoppedAt: new Date(), updatedAt: new Date() }).where(eq(instance.slug, instanceSlug))
    return { ok: true }
  }

  async restart(instanceSlug: string) {
    await this.stop(instanceSlug, { persist: false })
    return await this.start(instanceSlug)
  }

  /** Para todos os bots sem mexer no autoStart (usado no desligamento do container). */
  async stopAll() {
    await Promise.allSettled(this.runningSlugs().map((slug) => this.stop(slug, { persist: false })))
  }

  private clearRestartTimer(instanceSlug: string) {
    const timer = this.restartTimers.get(instanceSlug)
    if (timer) {
      clearTimeout(timer)
      this.restartTimers.delete(instanceSlug)
    }
  }

  private async handleExit(managed: ManagedProcess, code: number | null) {
    const slug = managed.instanceSlug
    if (managed.stopping) {
      return
    }

    const crashed = code !== 0
    await db
      .update(instance)
      .set({ status: crashed ? 'crashed' : 'stopped', stoppedAt: new Date(), updatedAt: new Date() })
      .where(eq(instance.slug, slug))
      .catch(() => undefined)

    const [row] = await db.select({ autoStart: instance.autoStart }).from(instance).where(eq(instance.slug, slug)).limit(1).catch(() => [])
    if (!crashed || !row?.autoStart) {
      return
    }

    const uptime = Date.now() - managed.startedAt
    const attempts = uptime > STABLE_UPTIME_MS ? 1 : (this.crashCounts.get(slug) ?? 0) + 1
    this.crashCounts.set(slug, attempts)
    if (attempts > MAX_CRASH_RESTARTS) {
      console.error(`[${slug}] crashed ${attempts - 1} times in a row; giving up on automatic restart.`)
      return
    }

    console.warn(`[${slug}] exited with code ${code}; restarting in ${RESTART_DELAY_MS / 1000}s (attempt ${attempts}/${MAX_CRASH_RESTARTS}).`)
    this.restartTimers.set(
      slug,
      setTimeout(() => {
        this.restartTimers.delete(slug)
        void this.start(slug, { persist: false }).catch((error) => console.error(`[${slug}] automatic restart failed:`, error))
      }, RESTART_DELAY_MS)
    )
  }

  private async handleChunk(managed: ManagedProcess, stream: 'stdout' | 'stderr', chunk: string) {
    const bufferKey = stream === 'stdout' ? 'stdoutBuffer' : 'stderrBuffer'
    managed[bufferKey] += chunk
    const lines = managed[bufferKey].split(/\r?\n/)
    managed[bufferKey] = lines.pop() ?? ''

    for (const line of lines) {
      if (!line) {
        continue
      }
      // Espelha a saída dos bots no log do container (visível na Coolify).
      console.log(`[${managed.instanceSlug}][${stream}] ${line}`)
      try {
        await this.logs.append(managed.instanceSlug, stream, line)
        if (stream === 'stdout') {
          const event = parseStdoutEvent(line)
          if (event) {
            await this.events.append(managed.instanceSlug, event)
          }
        }
      } catch (error) {
        console.error(`[${managed.instanceSlug}] failed to persist log line:`, error)
      }
    }
  }
}

function botEnvironment(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined && !SPAWNER_ONLY_ENV.test(entry[0]))
  )
}

/**
 * No Linux o `exec` faz o sinal chegar direto no bot. No Windows o processo filho é o cmd.exe,
 * então derrubamos a árvore inteira (bot + Chromium) com taskkill.
 */
function terminate(managed: ManagedProcess, signal: 'SIGTERM' | 'SIGKILL') {
  const pid = managed.process.pid
  if (process.platform === 'win32' && pid) {
    void execa('taskkill', ['/pid', String(pid), '/T', '/F'], { reject: false })
    return
  }
  managed.process.kill(signal)
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

export const childProcessManager = new ChildProcessManager()
