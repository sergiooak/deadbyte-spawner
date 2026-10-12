import { createError, eventHandler, getRouterParam } from 'h3'
import { createError as createEvlogError } from 'evlog'
import { eq, inArray } from 'drizzle-orm'
import { db } from '../../db/client.js'
import { command, commandAlias, instance, instanceCommand, instanceCommandAlias, repository, repositoryVersion } from '../../db/schema/index.js'

export default eventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Missing slug.' })
  }

  const [target] = await db.select({ official: repository.official }).from(repository).where(eq(repository.slug, slug)).limit(1)
  if (target?.official) {
    throw createEvlogError({
      message: 'O repositório oficial não pode ser excluído',
      status: 403,
      why: 'Ele é a origem padrão do bot e é recriado automaticamente a cada boot.',
      fix: 'Para usar outro código, cadastre um fork como novo repositório e aponte as instâncias para ele.'
    })
  }

  const linkedInstances = await db.select({ slug: instance.slug }).from(instance).where(eq(instance.repositorySlug, slug))
  if (linkedInstances.length > 0) {
    const names = linkedInstances.map((i) => i.slug).join(', ')
    throw createError({
      statusCode: 409,
      statusMessage: `Cannot delete repository: it is used by ${linkedInstances.length} instance(s): ${names}. Delete those instances first.`
    })
  }

  await db.transaction(async (tx) => {
    const commandRows = await tx.select({ id: command.id }).from(command).where(eq(command.repositorySlug, slug))
    const commandIds = commandRows.map((c) => c.id)

    if (commandIds.length > 0) {
      await tx.delete(instanceCommandAlias).where(inArray(instanceCommandAlias.commandId, commandIds))
      await tx.delete(instanceCommand).where(inArray(instanceCommand.commandId, commandIds))
    }

    await tx.delete(commandAlias).where(eq(commandAlias.repositorySlug, slug))
    await tx.delete(command).where(eq(command.repositorySlug, slug))
    await tx.delete(repositoryVersion).where(eq(repositoryVersion.repositorySlug, slug))
    await tx.delete(repository).where(eq(repository.slug, slug))
  })

  return { ok: true }
})
