import { createError, eventHandler, readValidatedBody } from 'h3'
import { createError as createEvlogError } from 'evlog'
import { z } from 'zod'
import { RepositoryService } from '../../services/repositories/repository.service.js'
import { requireSlug } from '../../utils/http.js'

const BodySchema = z.object({
  name: z.string().min(1).optional(),
  repositoryUrl: z.string().min(1).optional(),
  defaultBranch: z.string().min(1).optional(),
  installCommand: z.string().min(1).optional(),
  buildCommand: z.string().min(1).optional(),
  startCommand: z.string().min(1).optional(),
  manifestCommand: z.string().min(1).optional()
})

export default eventHandler(async (event) => {
  const slug = requireSlug(event)
  const body = await readValidatedBody(event, (value) => BodySchema.parse(value))
  const service = new RepositoryService()
  const current = await service.get(slug)
  if (current?.official && body.repositoryUrl && body.repositoryUrl !== current.repositoryUrl) {
    throw createEvlogError({
      message: 'A URL do repositório oficial não pode ser alterada',
      status: 403,
      why: 'Ela vem de DEADBYTE_BOT_DEFAULT_REPOSITORY_URL.',
      fix: 'Cadastre o fork como um novo repositório, ou mude a variável de ambiente se o oficial mudou de endereço.'
    })
  }
  const row = await service.update(slug, body)
  if (!row) {
    throw createError({ statusCode: 404, statusMessage: 'Repository not found.' })
  }
  return row
})
