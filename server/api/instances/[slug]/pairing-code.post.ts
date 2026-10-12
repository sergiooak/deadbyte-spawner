import { eventHandler, readValidatedBody } from 'h3'
import { z } from 'zod'
import { callBotApi } from '../../../services/instances/bot-internal-api.js'
import { requireSlug } from '../../../utils/http.js'

const BodySchema = z.object({
  phoneNumber: z.string().regex(/^\+?[\d\s()-]{10,24}$/, 'Número inválido.')
})

// O número só passa pela memória do bot: não é salvo no banco nem nos logs (LGPD: minimização).
export default eventHandler(async (event) => {
  const slug = requireSlug(event)
  const body = await readValidatedBody(event, (value) => BodySchema.parse(value))
  return await callBotApi(slug, '/pairing-code', { method: 'POST', body: { phoneNumber: body.phoneNumber } })
})
