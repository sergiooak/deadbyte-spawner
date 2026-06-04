import { RuntimeEventSchema, type DeadByteRuntimeEvent } from '@deadbyte/runtime'

export const DEADBYTE_EVENT_PREFIX = '__DEADBYTE_EVENT__'

export function parseStdoutEvent(line: string): DeadByteRuntimeEvent | undefined {
  if (!line.startsWith(DEADBYTE_EVENT_PREFIX)) {
    return undefined
  }

  const raw = line.slice(DEADBYTE_EVENT_PREFIX.length)
  return RuntimeEventSchema.parse(JSON.parse(raw))
}
