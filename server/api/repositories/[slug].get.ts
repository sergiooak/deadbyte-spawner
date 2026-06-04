import { createError, eventHandler, getRouterParam } from 'h3'
import { RepositoryService } from '../../services/repositories/repository.service.js'

export default eventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Missing slug.' })
  }
  const row = await new RepositoryService().get(slug)
  if (!row) {
    throw createError({ statusCode: 404, statusMessage: 'Repository not found.' })
  }
  return row
})
