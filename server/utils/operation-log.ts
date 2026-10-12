import { createRequestLogger, type RequestLogger } from 'evlog'
import { emitKept } from './spawner-log.js'

/**
 * Wide event para operações que não são requisições HTTP (sync, start, crash, boot...).
 * Acumule contexto com log.set() e o evento sai uma vez só, com duração e resultado.
 */
export async function withOperationLog<T>(
  operation: string,
  context: Record<string, unknown>,
  task: (log: RequestLogger) => Promise<T>
): Promise<T> {
  const log = createRequestLogger({ method: 'TASK', path: operation })
  log.set({ operation, ...context })
  const startedAt = Date.now()
  try {
    const result = await task(log)
    log.set({ outcome: 'ok' })
    return result
  } catch (error) {
    log.error(error instanceof Error ? error : String(error))
    log.set({ outcome: 'error' })
    throw error
  } finally {
    log.set({ durationMs: Date.now() - startedAt })
    emitKept(log)
  }
}

/** Mede uma etapa dentro de uma operação e registra a duração em steps.<nome>. */
export async function timedStep<T>(log: RequestLogger, step: string, task: () => Promise<T>): Promise<T> {
  const startedAt = Date.now()
  try {
    return await task()
  } finally {
    log.set({ steps: { [step]: { durationMs: Date.now() - startedAt } } })
  }
}
