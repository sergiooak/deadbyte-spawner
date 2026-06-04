import { eventHandler, readValidatedBody } from 'h3'
import { z } from 'zod'
import { InstanceService } from '../../services/instances/instance.service.js'

const BodySchema = z.object({
  repositorySlug: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  clientId: z.string().min(1),
  branch: z.string().min(1).default('master')
})

export default eventHandler(async (event) => {
  const body = await readValidatedBody(event, (value) => BodySchema.parse(value))
  return await new InstanceService().create(body)
})
