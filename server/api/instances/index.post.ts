import { eventHandler, readValidatedBody } from 'h3'
import { z } from 'zod'
import { InstanceService } from '../../services/instances/instance.service.js'
import { childProcessManager } from '../../services/process/child-process-manager.js'
import { withHttpErrors } from '../../utils/http.js'

const SlugSchema = z.string().min(1).regex(/^[a-z0-9][a-z0-9-]*$/, 'Use apenas letras minúsculas, números e hífen.')

const BodySchema = z.object({
  repositorySlug: z.string().min(1),
  name: z.string().min(1),
  slug: SlugSchema,
  clientId: SlugSchema,
  branch: z.string().min(1).optional(),
  autoStart: z.boolean().optional(),
  start: z.boolean().optional()
})

export default eventHandler(async (event) => {
  const body = await readValidatedBody(event, (value) => BodySchema.parse(value))
  return await withHttpErrors(async () => {
    const row = await new InstanceService().create(body)
    if (body.start) {
      await childProcessManager.start(body.slug)
    }
    return row
  })
})
