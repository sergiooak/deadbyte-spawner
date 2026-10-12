import { eventHandler, readValidatedBody } from 'h3'
import { z } from 'zod'
import { callBotApi } from '../../../services/instances/bot-internal-api.js'
import { requireSlug } from '../../../utils/http.js'

const BodySchema = z.object({
  chatId: z.string().min(1),
  text: z.string().min(1)
})

export default eventHandler(async (event) => {
  const slug = requireSlug(event)
  const body = await readValidatedBody(event, (value) => BodySchema.parse(value))
  return await callBotApi(slug, '/send-message', { method: 'POST', body })
})
