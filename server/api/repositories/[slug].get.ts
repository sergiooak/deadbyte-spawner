import { createError, eventHandler } from 'h3'
import { repositorySyncService } from '../../services/repositories/repository-sync.service.js'
import { RepositoryService } from '../../services/repositories/repository.service.js'
import { requireSlug } from '../../utils/http.js'

export default eventHandler(async (event) => {
  const slug = requireSlug(event)
  const row = await new RepositoryService().get(slug)
  if (!row) {
    throw createError({ statusCode: 404, statusMessage: 'Repository not found.' })
  }
  return { ...row, syncing: repositorySyncService.isSyncing(slug) }
})
