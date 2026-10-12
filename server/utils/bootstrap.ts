import { access, mkdir } from 'node:fs/promises'
import { resolve } from 'pathe'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { eq, inArray, lt } from 'drizzle-orm'
import postgres from 'postgres'
import { db } from '../db/client.js'
import { instance, runtimeEvent, runtimeProcessLog } from '../db/schema/index.js'
import { childProcessManager } from '../services/process/child-process-manager.js'
import { ensureOfficialRepository } from '../services/repositories/official-repository.js'
import { repositorySyncService } from '../services/repositories/repository-sync.service.js'
import { readSpawnerEnv } from './env.js'
import { timedStep, withOperationLog } from './operation-log.js'
import { spawnerPaths } from './paths.js'

/**
 * A LGPD não fixa prazo máximo: os dados ficam enquanto servirem à finalidade (arts. 15 e 16).
 * 180 dias acompanha o Marco Civil da Internet (art. 15), que exige guardar registros de acesso
 * a aplicações por 6 meses. Prazo maior precisa de justificativa documentada.
 */
export const DEFAULT_LOG_RETENTION_DAYS = 180

const RUNNING_STATUSES = ['installing', 'starting', 'waiting_qr', 'authenticated', 'ready', 'disconnected', 'stopping']

let bootstrapPromise: Promise<void> | undefined

/** Executa as migrations uma vez por processo. As rotas da API aguardam isso antes de responder. */
export function ensureBootstrapped(): Promise<void> {
  bootstrapPromise ??= runMigrations().catch((error) => {
    bootstrapPromise = undefined
    throw error
  })
  return bootstrapPromise
}

async function runMigrations() {
  const env = readSpawnerEnv()
  const paths = spawnerPaths()
  await Promise.all([paths.dataDir, paths.reposDir, paths.instancesDir, paths.sessionsDir, paths.logsDir].map((dir) => mkdir(dir, { recursive: true })))

  const migrationsFolder = resolve(process.env.DEADBYTE_MIGRATIONS_DIR ?? 'server/db/migrations')
  await access(migrationsFolder)
  const client = postgres(env.DATABASE_URL, { max: 1, onnotice: () => undefined })
  try {
    await migrate(drizzle(client), { migrationsFolder })
  } finally {
    await client.end()
  }
}

/**
 * Depois de um restart do container nenhum bot está rodando: zera os status
 * e sobe de novo as instâncias que estavam ligadas (autoStart).
 */
export async function resumeInstances() {
  await withOperationLog('spawner.boot', {}, async (log) => {
    await timedStep(log, 'migrations', () => ensureBootstrapped())
    log.set({ officialRepository: await ensureOfficialRepository() })
    const reset = await db
      .update(instance)
      .set({ status: 'stopped', updatedAt: new Date() })
      .where(inArray(instance.status, RUNNING_STATUSES))
      .returning({ slug: instance.slug })

    const rows = await db.select().from(instance).where(eq(instance.autoStart, true))
    const syncedRepos = new Set<string>()
    const results: Record<string, string> = {}
    for (const row of rows) {
      try {
        const repoReady = (await pathExists(resolve(row.repoPath, 'node_modules'))) && (await pathExists(resolve(row.repoPath, 'package.json')))
        if (!repoReady && !syncedRepos.has(row.repositorySlug)) {
          await timedStep(log, `sync:${row.repositorySlug}`, () => repositorySyncService.sync(row.repositorySlug))
          syncedRepos.add(row.repositorySlug)
        }
        await childProcessManager.start(row.slug, { persist: false })
        results[row.slug] = 'started'
      } catch (error) {
        results[row.slug] = `error: ${error instanceof Error ? error.message : String(error)}`
        await db.update(instance).set({ status: 'error', updatedAt: new Date() }).where(eq(instance.slug, row.slug))
      }
    }
    log.set({ staleStatusesReset: reset.length, autoStart: results, resyncedRepositories: [...syncedRepos] })
  })
}

export async function pruneOldLogs() {
  const days = Number(process.env.DEADBYTE_LOG_RETENTION_DAYS ?? DEFAULT_LOG_RETENTION_DAYS)
  if (!Number.isFinite(days) || days <= 0) {
    return
  }
  await withOperationLog('logs.prune', { retentionDays: days }, async (log) => {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const logs = await db.delete(runtimeProcessLog).where(lt(runtimeProcessLog.createdAt, cutoff)).returning({ id: runtimeProcessLog.id })
    const events = await db.delete(runtimeEvent).where(lt(runtimeEvent.createdAt, cutoff)).returning({ id: runtimeEvent.id })
    log.set({ deleted: { processLogs: logs.length, runtimeEvents: events.length } })
  })
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}
