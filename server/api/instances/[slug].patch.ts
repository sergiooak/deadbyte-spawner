import { createError, eventHandler, getRouterParam, readValidatedBody } from 'h3'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '../../db/client.js'
import { instance } from '../../db/schema/index.js'

const BodySchema = z.object({
  name: z.string().min(1).optional(),
  branch: z.string().min(1).optional()
})

export default eventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Missing slug.' })
  }
  const body = await readValidatedBody(event, (value) => BodySchema.parse(value))
  const [row] = await db.update(instance).set({ ...body, updatedAt: new Date() }).where(eq(instance.slug, slug)).returning()
  return row
})
