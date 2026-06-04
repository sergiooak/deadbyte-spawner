import type { DeadByteRuntimeEvent } from '@deadbyte/runtime'
import { RuntimeEventSchema } from '@deadbyte/runtime'
import { createConsoleLogger } from './create-console-logger.js'

type EvlogCandidate = {
  emit?: (event: DeadByteRuntimeEvent) => void | Promise<void>
  event?: (event: DeadByteRuntimeEvent) => void | Promise<void>
  log?: (event: DeadByteRuntimeEvent) => void | Promise<void>
}

export function createEventLogger() {
  const logger = createConsoleLogger()
  let evlogCandidate: EvlogCandidate | undefined
  void import('evlog').then((module) => {
    evlogCandidate = module as unknown as EvlogCandidate
  })

  return {
    async emit(event: DeadByteRuntimeEvent) {
      const parsed = RuntimeEventSchema.parse(event)
      logger[parsed.level === 'fatal' ? 'error' : parsed.level](parsed.message ?? parsed.name, parsed.payload ?? '')
      await evlogCandidate?.emit?.(parsed)
      await evlogCandidate?.event?.(parsed)
      await evlogCandidate?.log?.(parsed)
    }
  }
}
