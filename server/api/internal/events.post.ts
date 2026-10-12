import { RuntimeEventSchema } from '@deadbyte/runtime'
import { eventHandler, readBody } from 'h3'
import { z } from 'zod'
import { RuntimeEventService } from '../../services/logs/runtime-event.service.js'

// O schema do evento vem do runtime (zod 3); o slug extra é validado à parte com o zod do spawner.
const ExtraSchema = z.object({
  instanceSlug: z.string().optional()
})

export default eventHandler(async (event) => {
  const raw = await readBody<unknown>(event)
  const runtimeEvent = RuntimeEventSchema.parse(raw)
  const extra = ExtraSchema.parse(raw)
  await new RuntimeEventService().append(extra.instanceSlug ?? runtimeEvent.instanceId ?? null, runtimeEvent)
  return { ok: true }
})
