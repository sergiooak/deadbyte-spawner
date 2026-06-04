import { createError, eventHandler, getQuery, getRouterParam } from 'h3'
import { ProcessLogService } from '../../../services/logs/process-log.service.js'

export default eventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Missing slug.' })
  }
  const query = getQuery(event)
  return await new ProcessLogService().list(slug, Number(query.limit ?? 200))
})
