import { createRequestLogger, type DrainContext, type RequestLogger } from 'evlog'

/**
 * O plugin Nitro do evlog só entrega ao hook evlog:drain os eventos de requisição HTTP.
 * Operações internas (boot, sync, start/stop, crash) usam este módulo para chegar ao mesmo
 * arquivo NDJSON, sempre mantidas (sem amostragem).
 */
let drain: ((ctx: DrainContext) => unknown) | undefined

export function setSpawnerDrain(next: (ctx: DrainContext) => unknown): void {
  drain = next
}

export function emitKept(logger: RequestLogger, overrides: Record<string, unknown> = {}): void {
  const event = logger.emit({ ...overrides, _forceKeep: true })
  if (event && drain) void Promise.resolve(drain({ event })).catch(() => undefined)
}

type Level = 'info' | 'warn' | 'error'

function emitFields(level: Level, fields: Record<string, unknown> & { event: string }): void {
  const logger = createRequestLogger({ method: 'TASK', path: fields.event })
  logger.set(fields)
  if (level !== 'info') logger.setLevel(level)
  emitKept(logger)
}

/** Evento avulso do spawner, gravado no mesmo destino dos wide events. */
export const spawnerLog = {
  info: (fields: Record<string, unknown> & { event: string }) => emitFields('info', fields),
  warn: (fields: Record<string, unknown> & { event: string }) => emitFields('warn', fields),
  error: (fields: Record<string, unknown> & { event: string }) => emitFields('error', fields)
}
