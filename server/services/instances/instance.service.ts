import { mkdir } from 'node:fs/promises'
import { and, desc, eq } from 'drizzle-orm'
import { normalizeCommandName } from '@deadbyte/runtime'
import { db } from '../../db/client.js'
import { command, commandAlias, instance, instanceCommand, instanceCommandAlias, repositoryVersion } from '../../db/schema/index.js'
import { readSpawnerEnv } from '../../utils/env.js'
import { spawnerPaths } from '../../utils/paths.js'
import { PortService } from '../ports/port.service.js'
import { InstanceRuntimeConfigService } from './instance-runtime-config.service.js'

export class InstanceService {
  constructor(
    private readonly ports = new PortService(),
    private readonly runtimeConfig = new InstanceRuntimeConfigService()
  ) {}

  async list() {
    return await db.select().from(instance)
  }

  async get(slug: string) {
    const [row] = await db.select().from(instance).where(eq(instance.slug, slug)).limit(1)
    return row
  }

  async create(input: { repositorySlug: string; name: string; slug: string; clientId: string; branch: string }) {
    const env = readSpawnerEnv()
    const paths = spawnerPaths()
    const repoPath = paths.repositoryPath(input.repositorySlug)
    const instancePath = paths.instancePath(input.slug)
    const sessionPath = paths.sessionPath(input.slug)
    const runtimeConfigPath = paths.runtimeConfigPath(input.slug)
    const internalPort = await this.ports.findAvailablePort()

    await mkdir(instancePath, { recursive: true })
    await mkdir(sessionPath, { recursive: true })

    const [latestVersion] = await db
      .select()
      .from(repositoryVersion)
      .where(eq(repositoryVersion.repositorySlug, input.repositorySlug))
      .orderBy(desc(repositoryVersion.createdAt))
      .limit(1)

    const [row] = await db
      .insert(instance)
      .values({
        slug: input.slug,
        repositorySlug: input.repositorySlug,
        repositoryVersionId: latestVersion?.id,
        name: input.name,
        clientId: input.clientId,
        branch: input.branch || env.DEADBYTE_BOT_DEFAULT_BRANCH,
        sessionPath,
        repoPath,
        runtimeConfigPath,
        internalHost: env.DEADBYTE_INTERNAL_HOST,
        internalPort
      })
      .returning()

    const commands = await db.select().from(command).where(eq(command.repositorySlug, input.repositorySlug))
    for (const item of commands) {
      await db.insert(instanceCommand).values({
        instanceSlug: input.slug,
        commandId: item.id,
        enabled: item.defaultEnabled,
        ownerOnly: item.defaultOwnerOnly,
        config: {}
      })
    }

    const aliases = await db.select().from(commandAlias).where(eq(commandAlias.repositorySlug, input.repositorySlug))
    for (const alias of aliases) {
      await db.insert(instanceCommandAlias).values({
        instanceSlug: input.slug,
        commandId: alias.commandId,
        alias: alias.alias,
        normalizedAlias: alias.normalizedAlias,
        source: 'default'
      })
    }

    await this.runtimeConfig.generate(input.slug)
    return row
  }

  async commands(slug: string) {
    return await db
      .select({
        commandId: command.id,
        commandKey: command.commandKey,
        name: command.name,
        group: command.group,
        enabled: instanceCommand.enabled,
        ownerOnly: instanceCommand.ownerOnly,
        descriptionOverride: instanceCommand.descriptionOverride,
        disabledMessage: instanceCommand.disabledMessage,
        config: instanceCommand.config
      })
      .from(instanceCommand)
      .innerJoin(command, eq(command.id, instanceCommand.commandId))
      .where(eq(instanceCommand.instanceSlug, slug))
  }

  async updateCommands(
    slug: string,
    updates: Array<{
      commandId: string
      enabled?: boolean
      ownerOnly?: boolean
      aliases?: string[]
      config?: Record<string, unknown>
      disabledMessage?: string
    }>
  ) {
    await this.runtimeConfig.validateAliases(
      slug,
      updates.filter((update) => update.aliases).map((update) => ({ commandId: update.commandId, aliases: update.aliases ?? [] }))
    )

    for (const update of updates) {
      await db
        .update(instanceCommand)
        .set({
          enabled: update.enabled,
          ownerOnly: update.ownerOnly,
          config: update.config,
          disabledMessage: update.disabledMessage,
          updatedAt: new Date()
        })
        .where(and(eq(instanceCommand.instanceSlug, slug), eq(instanceCommand.commandId, update.commandId)))

      if (update.aliases) {
        await db
          .delete(instanceCommandAlias)
          .where(and(eq(instanceCommandAlias.instanceSlug, slug), eq(instanceCommandAlias.commandId, update.commandId)))

        for (const alias of update.aliases) {
          await db.insert(instanceCommandAlias).values({
            instanceSlug: slug,
            commandId: update.commandId,
            alias,
            normalizedAlias: normalizeCommandName(alias),
            source: 'custom'
          })
        }
      }
    }

    await this.runtimeConfig.generate(slug)
    return await this.commands(slug)
  }
}
