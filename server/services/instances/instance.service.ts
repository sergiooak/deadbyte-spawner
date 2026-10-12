import { mkdir } from 'node:fs/promises'
import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import { normalizeCommandName } from '@deadbyte/runtime'
import { db } from '../../db/client.js'
import { command, commandAlias, instance, instanceCommand, instanceCommandAlias, repository, repositoryVersion } from '../../db/schema/index.js'
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
    return await db.select().from(instance).orderBy(instance.name)
  }

  async get(slug: string) {
    const [row] = await db.select().from(instance).where(eq(instance.slug, slug)).limit(1)
    return row
  }

  async create(input: { repositorySlug: string; name: string; slug: string; clientId: string; branch?: string; autoStart?: boolean }) {
    const env = readSpawnerEnv()
    const [repo] = await db.select().from(repository).where(eq(repository.slug, input.repositorySlug)).limit(1)
    if (!repo) {
      throw new Error(`Repository not found: ${input.repositorySlug}`)
    }
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
        branch: input.branch || repo.defaultBranch || env.DEADBYTE_BOT_DEFAULT_BRANCH,
        commitHash: latestVersion?.commitHash,
        autoStart: input.autoStart ?? false,
        sessionPath,
        repoPath,
        runtimeConfigPath,
        internalHost: env.DEADBYTE_INTERNAL_HOST,
        internalPort
      })
      .returning()

    await this.ensureCommands(input.slug)
    await this.runtimeConfig.generate(input.slug)
    return row
  }

  /**
   * Garante uma linha de configuração para cada comando ativo do repositório.
   * Comandos novos chegam com os padrões do manifesto; aliases em colisão são ignorados.
   */
  async ensureCommands(slug: string) {
    const row = await this.get(slug)
    if (!row) {
      throw new Error(`Instance not found: ${slug}`)
    }

    const existing = await db.select({ commandId: instanceCommand.commandId }).from(instanceCommand).where(eq(instanceCommand.instanceSlug, slug))
    const configured = new Set(existing.map((item) => item.commandId))
    const commands = await db
      .select()
      .from(command)
      .where(and(eq(command.repositorySlug, row.repositorySlug), eq(command.status, 'active')))
    const missing = commands.filter((item) => !configured.has(item.id))
    if (!missing.length) {
      return 0
    }

    await db
      .insert(instanceCommand)
      .values(
        missing.map((item) => ({
          instanceSlug: slug,
          commandId: item.id,
          enabled: item.defaultEnabled,
          ownerOnly: item.defaultOwnerOnly,
          config: {}
        }))
      )
      .onConflictDoNothing()

    const aliases = await db
      .select()
      .from(commandAlias)
      .where(and(eq(commandAlias.repositorySlug, row.repositorySlug), inArray(commandAlias.commandId, missing.map((item) => item.id))))
    if (aliases.length) {
      await db
        .insert(instanceCommandAlias)
        .values(
          aliases.map((alias) => ({
            instanceSlug: slug,
            commandId: alias.commandId,
            alias: alias.alias,
            normalizedAlias: alias.normalizedAlias,
            source: 'default'
          }))
        )
        .onConflictDoNothing()
    }

    return missing.length
  }

  async commands(slug: string) {
    const rows = await db
      .select({
        commandId: command.id,
        commandKey: command.commandKey,
        name: command.name,
        group: command.group,
        description: command.description,
        status: command.status,
        supportsPrivate: command.supportsPrivate,
        supportsGroups: command.supportsGroups,
        enabled: instanceCommand.enabled,
        ownerOnly: instanceCommand.ownerOnly,
        descriptionOverride: instanceCommand.descriptionOverride,
        disabledMessage: instanceCommand.disabledMessage,
        config: instanceCommand.config
      })
      .from(instanceCommand)
      .innerJoin(command, eq(command.id, instanceCommand.commandId))
      .where(eq(instanceCommand.instanceSlug, slug))
      .orderBy(asc(command.group), asc(command.commandKey))

    const aliases = await db
      .select({ commandId: instanceCommandAlias.commandId, alias: instanceCommandAlias.alias })
      .from(instanceCommandAlias)
      .where(eq(instanceCommandAlias.instanceSlug, slug))
      .orderBy(asc(instanceCommandAlias.createdAt))

    return rows.map((row) => ({
      ...row,
      aliases: aliases.filter((alias) => alias.commandId === row.commandId).map((alias) => alias.alias)
    }))
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
          await db
            .insert(instanceCommandAlias)
            .values({
              instanceSlug: slug,
              commandId: update.commandId,
              alias,
              normalizedAlias: normalizeCommandName(alias),
              source: 'custom'
            })
            .onConflictDoNothing()
        }
      }
    }

    await this.runtimeConfig.generate(slug)
    return await this.commands(slug)
  }
}
