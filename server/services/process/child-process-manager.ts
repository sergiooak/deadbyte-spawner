import { eq } from 'drizzle-orm'
import { execaCommand } from 'execa'
import { db } from '../../db/client.js'
import { instance, repository } from '../../db/schema/index.js'
import { readSpawnerEnv } from '../../utils/env.js'
import { InstanceRuntimeConfigService } from '../instances/instance-runtime-config.service.js'
import { ProcessLogService } from '../logs/process-log.service.js'
import { RuntimeEventService } from '../logs/runtime-event.service.js'
import { parseStdoutEvent } from '../logs/stdout-event-parser.js'
import type { ManagedProcess } from './process-manager.types.js'

export class ChildProcessManager {
  private readonly processes = new Map<string, ManagedProcess>()

  constructor(
    private readonly runtimeConfig = new InstanceRuntimeConfigService(),
    private readonly logs = new ProcessLogService(),
    private readonly events = new RuntimeEventService()
  ) { }

  async start(instanceSlug: string) {
    const env = readSpawnerEnv()
    const [row] = await db.select().from(instance).where(eq(instance.slug, instanceSlug)).limit(1)
    if (!row) {
      throw new Error(`Instance not found: ${instanceSlug}`)
    }

    if (this.processes.has(instanceSlug)) {
      return { ok: true, alreadyRunning: true }
    }

    await this.runtimeConfig.generate(instanceSlug)
    await db
      .update(instance)
      .set({ status: 'starting', startedAt: new Date(), updatedAt: new Date() })
      .where(eq(instance.slug, instanceSlug))

    const [repo] = await db.select().from(repository).where(eq(repository.slug, row.repositorySlug)).limit(1)
    const startCommand = repo?.startCommand ?? 'pnpm start:ts'
    const command = [
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
        DEADBYTE_CHROME_PATH: env.DEADBYTE_CHROME_PATH || undefined,
        FFMPEG_PATH: env.FFMPEG_PATH || undefined,
        FFPROBE_PATH: env.FFPROBE_PATH || undefined
      },
      shell: true,
      all: false,
      reject: false
    })

    const managed: ManagedProcess = {
      instanceSlug,
      process: child,
      stdoutBuffer: '',
      stderrBuffer: ''
    }
    this.processes.set(instanceSlug, managed)

    child.stdout?.on('data', (chunk: Buffer) => {
      void this.handleChunk(managed, 'stdout', chunk.toString('utf8'))
    })
    child.stderr?.on('data', (chunk: Buffer) => {
      void this.handleChunk(managed, 'stderr', chunk.toString('utf8'))
    })
    child.on('exit', () => {
      this.processes.delete(instanceSlug)
      void db.update(instance).set({ status: 'stopped', stoppedAt: new Date(), updatedAt: new Date() }).where(eq(instance.slug, instanceSlug))
    })

    return { ok: true, pid: child.pid }
  }

  async stop(instanceSlug: string) {
    const managed = this.processes.get(instanceSlug)
    await db.update(instance).set({ status: 'stopping', updatedAt: new Date() }).where(eq(instance.slug, instanceSlug))
    if (managed) {
      managed.process.kill('SIGTERM')
      this.processes.delete(instanceSlug)
    }
    await db.update(instance).set({ status: 'stopped', stoppedAt: new Date(), updatedAt: new Date() }).where(eq(instance.slug, instanceSlug))
    return { ok: true }
  }

  async restart(instanceSlug: string) {
    await this.stop(instanceSlug)
    return await this.start(instanceSlug)
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
      // TODO: remove temporary stdout logging
      console.log(`[${managed.instanceSlug}][${stream}] ${line}`)
      await this.logs.append(managed.instanceSlug, stream, line)
      if (stream === 'stdout') {
        const event = parseStdoutEvent(line)
        if (event) {
          await this.events.append(managed.instanceSlug, event)
        }
      }
    }
  }
}

export const childProcessManager = new ChildProcessManager()
