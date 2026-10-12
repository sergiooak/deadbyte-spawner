import { eventHandler } from 'h3'
import { callBotApi } from '../../../services/instances/bot-internal-api.js'
import { requireSlug } from '../../../utils/http.js'

export default eventHandler(async (event) => {
  return await callBotApi(requireSlug(event), '/pairing-code', { method: 'DELETE' })
})
