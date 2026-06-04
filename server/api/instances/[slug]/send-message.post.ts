import { createError, eventHandler, getRouterParam, readValidatedBody } from 'h3'
import { ofetch } from 'ofetch'
import { z } from 'zod'
import { InstanceService } from '../../../services/instances/instance.service.js'

const BodySchema = z.object({
  chatId: z.string().min(1),
  text: z.string().min(1)
})

export default eventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Missing slug.' })
  }
  const body = await readValidatedBody(event, (value) => BodySchema.parse(value))
  const instance = await new InstanceService().get(slug)
  if (!instance?.internalPort) {
    throw createError({ statusCode: 409, statusMessage: 'Instance internal API is not configured.' })
  }
  return await ofetch(`http://${instance.internalHost}:${instance.internalPort}/send-message`, {
    method: 'POST',
    body
  })
})
