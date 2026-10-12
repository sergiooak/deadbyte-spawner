import { eventHandler, readValidatedBody } from 'h3'
import { z } from 'zod'
import { RepositoryService } from '../../services/repositories/repository.service.js'
import { withHttpErrors } from '../../utils/http.js'

const BodySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9][a-z0-9-]*$/, 'Use apenas letras minúsculas, números e hífen.'),
  repositoryUrl: z.string().min(1),
  defaultBranch: z.string().min(1).default('main'),
  installCommand: z.string().min(1).optional(),
  buildCommand: z.string().min(1).optional(),
  startCommand: z.string().min(1).optional(),
  manifestCommand: z.string().min(1).optional()
})

export default eventHandler(async (event) => {
  const body = await readValidatedBody(event, (value) => BodySchema.parse(value))
  return await withHttpErrors(() => new RepositoryService().create(body))
})
