import { createError, eventHandler, getQuery, getRouterParam } from 'h3'
import { RuntimeEventService } from '../../../services/logs/runtime-event.service.js'

export default eventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Missing slug.' })
  }
  const query = getQuery(event)
  return await new RuntimeEventService().list(slug, Number(query.limit ?? 200))
})
