import { createError, eventHandler, getRouterParam } from 'h3'
import { SessionService } from '../../../services/sessions/session.service.js'

export default eventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Missing slug.' })
  }
  await new SessionService().clear(slug)
  return { ok: true }
})
