import { createError, eventHandler, getRouterParam } from 'h3'
import { repositorySyncService } from '../../../services/repositories/repository-sync.service.js'
import { RepositoryService } from '../../../services/repositories/repository.service.js'

export default eventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Missing slug.' })
  }
  const repository = await new RepositoryService().get(slug)
  if (!repository) {
    throw createError({ statusCode: 404, statusMessage: 'Repository not found.' })
  }

  try {
    return await repositorySyncService.sync(slug)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw createError({ statusCode: 500, statusMessage: 'Sync failed.', data: { message: message.slice(-2000) } })
  }
})
