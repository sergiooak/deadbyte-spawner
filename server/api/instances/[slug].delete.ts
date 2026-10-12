import { rm } from 'node:fs/promises'
import { createError, eventHandler, getRouterParam } from 'h3'
import { eq } from 'drizzle-orm'
import { db } from '../../db/client.js'
import {
  commandExecution,
  instance,
  instanceCommand,
  instanceCommandAlias,
  instanceDailyStat,
  messageEvent,
  runtimeEvent,
  runtimeProcessLog,
  seenChat,
  seenContact
} from '../../db/schema/index.js'
import { childProcessManager } from '../../services/process/child-process-manager.js'
import { spawnerPaths } from '../../utils/paths.js'

export default eventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Missing slug.' })
  }

  await childProcessManager.stop(slug)

  await db.transaction(async (tx) => {
    await tx.delete(instanceCommandAlias).where(eq(instanceCommandAlias.instanceSlug, slug))
    await tx.delete(instanceCommand).where(eq(instanceCommand.instanceSlug, slug))
    await tx.delete(runtimeProcessLog).where(eq(runtimeProcessLog.instanceSlug, slug))
    await tx.delete(runtimeEvent).where(eq(runtimeEvent.instanceSlug, slug))
    await tx.delete(commandExecution).where(eq(commandExecution.instanceSlug, slug))
    await tx.delete(messageEvent).where(eq(messageEvent.instanceSlug, slug))
    await tx.delete(seenContact).where(eq(seenContact.instanceSlug, slug))
    await tx.delete(seenChat).where(eq(seenChat.instanceSlug, slug))
    await tx.delete(instanceDailyStat).where(eq(instanceDailyStat.instanceSlug, slug))
    await tx.delete(instance).where(eq(instance.slug, slug))
  })

  const paths = spawnerPaths()
  await rm(paths.instancePath(slug), { recursive: true, force: true })
  await rm(paths.sessionPath(slug), { recursive: true, force: true })

  return { ok: true }
})
