import { createError, eventHandler, getRouterParam, readValidatedBody } from 'h3'
import { z } from 'zod'
import { InstanceService } from '../../../services/instances/instance.service.js'

const BodySchema = z.object({
  commands: z.array(
    z.object({
      commandId: z.string().uuid(),
      enabled: z.boolean().optional(),
      ownerOnly: z.boolean().optional(),
      aliases: z.array(z.string()).optional(),
      config: z.record(z.string(), z.unknown()).optional(),
      disabledMessage: z.string().optional()
    })
  )
})

export default eventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Missing slug.' })
  }
  const body = await readValidatedBody(event, (value) => BodySchema.parse(value))
  return await new InstanceService().updateCommands(slug, body.commands)
})
