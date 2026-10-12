import { access, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'pathe'
import { eq } from 'drizzle-orm'
import { execa, execaCommand } from 'execa'
import { createError } from 'evlog'
import { db } from '../../db/client.js'
import { instance, repository } from '../../db/schema/index.js'
import { readSpawnerEnv } from '../../utils/env.js'
import { InstanceService } from '../instances/instance.service.js'
import { InstanceRuntimeConfigService } from '../instances/instance-runtime-config.service.js'
import { ProcessLogService } from '../logs/process-log.service.js'
import { RuntimeEventService } from '../logs/runtime-event.service.js'
import { parseStdoutEvent } from '../logs/stdout-event-parser.js'
import type { ManagedProcess } from './process-manager.types.js'
import { DEFAULT_LOG_RETENTION_DAYS } from '../../utils/bootstrap.js'
import { withOperationLog } from '../../utils/operation-log.js'
import { spawnerPaths } from '../../utils/paths.js'
import { publish } from '../../utils/realtime.js'
import { spawnerLog } from '../../utils/spawner-log.js'

// Segredos do spawner que os bots não precisam receber.
const SPAWNER_ONLY_ENV = /^(DATABASE_URL|DEADBYTE_ADMIN_PASSWORD|SERVICE_(PASSWORD|USER|BASE64)_.*)$/

const STOP_TIMEOUT_MS = 20_000
const RESTART_DELAY_MS = 15_000
const MAX_CRASH_RESTARTS = 5
// Um processo que ficou de pé por esse tempo zera o contador de crashes.
const STABLE_UPTIME_MS = 5 * 60_000
const STDERR_TAIL_LINES = 30

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
    return await withOperationLog('instance.start', { instanceSlug, trigger: options.persist === false ? 'automatic' : 'manual' }, (opLog) =>
      this.startProcess(instanceSlug, options, opLog)
    )
  }

  private async startProcess(instanceSlug: string, options: { persist?: boolean }, opLog: { set: (fields: Record<string, unknown>) => void }) {
    const env = readSpawnerEnv()
    const [row] = await db.select().from(instance).where(eq(instance.slug, instanceSlug)).limit(1)
    if (!row) {
      throw new Error(`Instance not found: ${instanceSlug}`)
    }

    this.clearRestartTimer(instanceSlug)
    if (this.processes.has(instanceSlug)) {
      opLog.set({ alreadyRunning: true })
      return { ok: true, alreadyRunning: true }
    }

    const [repo] = await db.select().from(repository).where(eq(repository.slug, row.repositorySlug)).limit(1)
    if (!(await pathExists(join(row.repoPath, 'package.json')))) {
      throw createError({
        message: `O repositório ${row.repositorySlug} ainda não foi sincronizado`,
        status: 409,
        why: 'O código do bot ainda não foi clonado e buildado neste servidor.',
        fix: `Abra Repositórios > ${row.repositorySlug} e clique em Sincronizar; depois inicie a instância.`
      })
    }

    // Um bot desta instância que sobreviveu a um restart do spawner segura o perfil do Chromium e a porta.
    const orphan = await killOrphanBot(pidFile(instanceSlug))
    const strays = await killStrayBots(instanceSlug)
    if (orphan || strays) opLog.set({ orphanKilled: orphan, strayBotsKilled: strays })
    if (await releaseChromiumProfile(row.sessionPath, row.clientId)) opLog.set({ orphanChromiumKilled: true })
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
        // Logs sem códigos de cor ANSI: ficam legíveis no painel e no evlog.
        NO_COLOR: '1',
        FORCE_COLOR: '0',
        // Logs evlog do bot (wide event por mensagem), no mesmo volume e com a mesma retenção.
        DEADBYTE_EVLOG_DIR: join(spawnerPaths().logsDir, 'bots', row.slug),
        DEADBYTE_LOG_RETENTION_DAYS: String(process.env.DEADBYTE_LOG_RETENTION_DAYS ?? DEFAULT_LOG_RETENTION_DAYS),
        DEADBYTE_COMMIT: row.commitHash ?? undefined,
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
      stderrTail: [],
      startedAt: Date.now(),
      stopping: false,
      exited: new Promise<void>((resolve) => {
        resolveExited = resolve
      })
    }
    this.processes.set(instanceSlug, managed)
    if (child.pid) await writeFile(pidFile(instanceSlug), String(child.pid), 'utf8').catch(() => undefined)

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
      void rm(pidFile(instanceSlug), { force: true }).catch(() => undefined)
      void this.handleExit(managed, code)
    })

    opLog.set({ pid: child.pid, repository: row.repositorySlug, commit: row.commitHash, internalPort: row.internalPort })
    publish({ type: 'instance.status', slug: instanceSlug, status: 'starting' })
    return { ok: true, pid: child.pid }
  }

  async stop(instanceSlug: string, options: { persist?: boolean } = {}) {
    return await withOperationLog('instance.stop', { instanceSlug, trigger: options.persist === false ? 'automatic' : 'manual' }, (opLog) =>
      this.stopProcess(instanceSlug, options, opLog)
    )
  }

  private async stopProcess(instanceSlug: string, options: { persist?: boolean }, opLog: { set: (fields: Record<string, unknown>) => void }) {
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
      opLog.set({ wasRunning: true, forcedKill: timedOut, uptimeMs: Date.now() - managed.startedAt })
      this.processes.delete(instanceSlug)
    }

    await db.update(instance).set({ status: 'stopped', stoppedAt: new Date(), updatedAt: new Date() }).where(eq(instance.slug, instanceSlug))
    publish({ type: 'instance.status', slug: instanceSlug, status: 'stopped' })
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
    const uptimeMs = Date.now() - managed.startedAt
    publish({ type: 'instance.status', slug, status: crashed ? 'crashed' : 'stopped' })
    await db
      .update(instance)
      .set({ status: crashed ? 'crashed' : 'stopped', stoppedAt: new Date(), updatedAt: new Date() })
      .where(eq(instance.slug, slug))
      .catch(() => undefined)

    const [row] = await db.select({ autoStart: instance.autoStart }).from(instance).where(eq(instance.slug, slug)).limit(1).catch(() => [])
    const attempts = uptimeMs > STABLE_UPTIME_MS ? 1 : (this.crashCounts.get(slug) ?? 0) + 1
    const willRestart = crashed && Boolean(row?.autoStart) && attempts <= MAX_CRASH_RESTARTS

    const fields = {
      event: 'instance.exit',
      instanceSlug: slug,
      exitCode: code,
      crashed,
      uptimeMs,
      restart: willRestart ? { attempt: attempts, of: MAX_CRASH_RESTARTS, inMs: RESTART_DELAY_MS } : null,
      stderrTail: crashed ? managed.stderrTail : undefined
    }
    if (!crashed) {
      spawnerLog.info(fields)
      return
    }
    if (!willRestart) {
      spawnerLog.error({
        ...fields,
        why: row?.autoStart ? `O bot caiu ${attempts - 1} vezes seguidas em menos de ${STABLE_UPTIME_MS / 60_000} min.` : 'O bot caiu e o auto-start está desligado.',
        fix: 'Veja stderrTail e os logs em /data/logs/bots/<instância>; corrija e inicie a instância pelo painel.'
      })
      return
    }

    spawnerLog.warn(fields)
    this.crashCounts.set(slug, attempts)
    this.restartTimers.set(
      slug,
      setTimeout(() => {
        this.restartTimers.delete(slug)
        void this.start(slug, { persist: false }).catch(() => undefined)
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
      if (stream === 'stderr') {
        managed.stderrTail.push(line)
        if (managed.stderrTail.length > STDERR_TAIL_LINES) managed.stderrTail.shift()
        // Erros dos bots também aparecem no log do container (Coolify).
        console.error(`[${managed.instanceSlug}] ${line}`)
      }
      try {
        await this.logs.append(managed.instanceSlug, stream, line)
        publish({ type: 'instance.log', slug: managed.instanceSlug, log: { stream, line, createdAt: new Date().toISOString() } })
        if (stream === 'stdout') {
          const event = parseStdoutEvent(line)
          if (event) {
            const stored = await this.events.append(managed.instanceSlug, event)
            if (stored) publish({ type: 'instance.event', slug: managed.instanceSlug, event: stored })
          }
        }
      } catch (error) {
        spawnerLog.error({ event: 'process.log.persist_failed', instanceSlug: managed.instanceSlug, error: error instanceof Error ? error.message : String(error) })
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
function pidFile(instanceSlug: string): string {
  return join(spawnerPaths().instancePath(instanceSlug), 'bot.pid')
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

/** Encerra o bot registrado no pidfile, se ainda estiver vivo. Devolve o PID encerrado. */
async function killOrphanBot(file: string): Promise<number | undefined> {
  const pid = Number(await readFile(file, 'utf8').catch(() => ''))
  if (!Number.isInteger(pid) || pid <= 1 || pid === process.pid || !isAlive(pid)) {
    await rm(file, { force: true })
    return undefined
  }
  if (process.platform === 'win32') {
    await execa('taskkill', ['/pid', String(pid), '/T', '/F'], { reject: false })
  } else {
    // SIGTERM deixa o bot fechar o Chromium; SIGKILL se não sair em 15 s.
    process.kill(pid, 'SIGTERM')
    for (let waited = 0; waited < 15_000 && isAlive(pid); waited += 250) {
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
    if (isAlive(pid)) process.kill(pid, 'SIGKILL')
  }
  await rm(file, { force: true })
  return pid
}

/**
 * Rede de segurança além do pidfile: encerra qualquer processo de bot desta instância que não seja
 * gerenciado aqui (ex.: pidfile sobrescrito). Casa por "--instance-id <slug>" na linha de comando.
 */
async function killStrayBots(instanceSlug: string): Promise<number> {
  if (process.platform === 'win32') {
    const script = `$n=0; Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match '--instance-id ${instanceSlug}( |$)' -and $_.ProcessId -ne ${process.pid} } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue; $n++ }; $n`
    const result = await execa('powershell', ['-NoProfile', '-Command', script], { reject: false })
    return Number(String(result.stdout).trim()) || 0
  }
  const pattern = `--instance-id ${instanceSlug}( |$)`
  const listed = await execa('pgrep', ['-f', pattern], { reject: false })
  const pids = String(listed.stdout).split(/\s+/).map(Number).filter((pid) => pid > 1 && pid !== process.pid)
  if (!pids.length) return 0
  await execa('pkill', ['-TERM', '-f', pattern], { reject: false })
  for (let waited = 0; waited < 10_000 && pids.some(isAlive); waited += 250) {
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  if (pids.some(isAlive)) await execa('pkill', ['-KILL', '-f', pattern], { reject: false })
  return pids.length
}

function terminate(managed: ManagedProcess, signal: 'SIGTERM' | 'SIGKILL') {
  const pid = managed.process.pid
  if (process.platform === 'win32' && pid) {
    void execa('taskkill', ['/pid', String(pid), '/T', '/F'], { reject: false })
    return
  }
  managed.process.kill(signal)
}

/**
 * Libera o perfil do Chromium da instância antes de iniciar o bot. Se um bot anterior morreu sem fechar
 * o navegador (SIGKILL, crash do spawner), o Chromium órfão segura o perfil e o novo bot falha com
 * "browser is already running". Nenhum bot desta instância está rodando aqui, então é seguro encerrar.
 */
async function releaseChromiumProfile(sessionPath: string, clientId: string): Promise<boolean> {
  const profile = join(sessionPath, `session-${clientId}`)
  let killed = false
  if (process.platform === 'win32') {
    const target = profile.replaceAll('/', '\\').replaceAll("'", "''")
    const script = `$n=0; Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $_.CommandLine -like '*${target}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue; $n++ }; $n`
    const result = await execa('powershell', ['-NoProfile', '-Command', script], { reject: false })
    killed = Number(String(result.stdout).trim()) > 0
  } else {
    const result = await execa('pkill', ['-f', `user-data-dir=${profile}`], { reject: false })
    killed = result.exitCode === 0
  }
  if (killed) await new Promise((resolve) => setTimeout(resolve, 1000))
  await Promise.all(['SingletonLock', 'SingletonSocket', 'SingletonCookie', 'lockfile'].map((name) => rm(join(profile, name), { force: true })))
  return killed
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
