import { eventHandler, readValidatedBody } from 'h3'
import { z } from 'zod'
import { RepositoryService } from '../../services/repositories/repository.service.js'

const BodySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  repositoryUrl: z.string().min(1),
  defaultBranch: z.string().min(1).default('main')
})

export default eventHandler(async (event) => {
  const body = await readValidatedBody(event, (value) => BodySchema.parse(value))
  return await new RepositoryService().create(body)
})
