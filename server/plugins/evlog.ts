import type { DrainContext } from 'evlog'
import { createFsDrain } from 'evlog/fs'
import { createDrainPipeline } from 'evlog/pipeline'
import { join } from 'pathe'
import { DEFAULT_LOG_RETENTION_DAYS } from '../utils/bootstrap.js'
import { spawnerPaths } from '../utils/paths.js'
import { setSpawnerDrain } from '../utils/spawner-log.js'

/**
 * Destino dos wide events do spawner: NDJSON diário em <DEADBYTE_LOGS_DIR>/spawner (volume /data no
 * Docker), além do stdout que a Coolify mostra. Formato e roteiro de revisão em LOGS.md.
 */
export default defineNitroPlugin((nitroApp) => {
  if (import.meta.prerender) {
    return
  }

  const retentionDays = Number(process.env.DEADBYTE_LOG_RETENTION_DAYS ?? DEFAULT_LOG_RETENTION_DAYS)
  const pipeline = createDrainPipeline<DrainContext>({
    batch: { size: 50, intervalMs: 3000 },
    retry: { maxAttempts: 3, backoff: 'exponential', initialDelayMs: 500 },
    onDropped: (events, error) => console.error(`[evlog] ${events.length} eventos descartados:`, error?.message)
  })
  const drain = pipeline(
    createFsDrain({
      dir: join(spawnerPaths().logsDir, 'spawner'),
      pretty: false,
      // Um arquivo por dia.
      maxFiles: retentionDays > 0 ? retentionDays : undefined
    })
  )

  nitroApp.hooks.hook('evlog:drain', drain)
  // Operações internas (fora de requisições) também vão para este drain.
  setSpawnerDrain(drain)

  // Leituras do polling são amostradas (nuxt.config); escritas e operações internas ficam sempre.
  nitroApp.hooks.hook('evlog:emit:keep', (ctx) => {
    if (ctx.method && ctx.method !== 'GET') {
      ctx.shouldKeep = true
    }
  })

  nitroApp.hooks.hook('close', async () => {
    await drain.flush()
  })
})
