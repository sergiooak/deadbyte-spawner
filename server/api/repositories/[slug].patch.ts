import { createError, eventHandler, getRouterParam, readValidatedBody } from 'h3'
import { z } from 'zod'
import { RepositoryService } from '../../services/repositories/repository.service.js'

const BodySchema = z.object({
  name: z.string().min(1).optional(),
  repositoryUrl: z.string().min(1).optional(),
  defaultBranch: z.string().min(1).optional()
})

export default eventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Missing slug.' })
  }
  const body = await readValidatedBody(event, (value) => BodySchema.parse(value))
  return await new RepositoryService().update(slug, body)
})
