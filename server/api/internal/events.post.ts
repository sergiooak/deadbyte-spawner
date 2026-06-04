import { RuntimeEventSchema } from '@deadbyte/runtime'
import { eventHandler, readValidatedBody } from 'h3'
import { z } from 'zod'
import { RuntimeEventService } from '../../services/logs/runtime-event.service.js'

const BodySchema = RuntimeEventSchema.extend({
  instanceSlug: z.string().optional()
})

export default eventHandler(async (event) => {
  const body = await readValidatedBody(event, (value) => BodySchema.parse(value))
  await new RuntimeEventService().append(body.instanceSlug ?? body.instanceId ?? null, body)
  return { ok: true }
})
