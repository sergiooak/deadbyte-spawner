import { createError, eventHandler, getRouterParam } from 'h3'
import { eq } from 'drizzle-orm'
import { db } from '../../../db/client.js'
import { command } from '../../../db/schema/index.js'

export default eventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Missing slug.' })
  }
  return await db.select().from(command).where(eq(command.repositorySlug, slug))
})
