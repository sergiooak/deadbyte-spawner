import { createError, eventHandler, readValidatedBody } from 'h3'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '../../db/client.js'
import { instance } from '../../db/schema/index.js'
import { requireSlug } from '../../utils/http.js'

const BodySchema = z.object({
  name: z.string().min(1).optional(),
  branch: z.string().min(1).optional(),
  autoStart: z.boolean().optional()
})

export default eventHandler(async (event) => {
  const slug = requireSlug(event)
  const body = await readValidatedBody(event, (value) => BodySchema.parse(value))
  const [row] = await db.update(instance).set({ ...body, updatedAt: new Date() }).where(eq(instance.slug, slug)).returning()
  if (!row) {
    throw createError({ statusCode: 404, statusMessage: 'Instance not found.' })
  }
  return row
})
