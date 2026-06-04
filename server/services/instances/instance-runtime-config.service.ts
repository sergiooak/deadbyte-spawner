import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'pathe'
import { eq } from 'drizzle-orm'
import { defineDeadByteConfig, normalizeCommandName } from '@deadbyte/runtime'
import { db } from '../../db/client.js'
import { command, instance, instanceCommand, instanceCommandAlias } from '../../db/schema/index.js'

export class InstanceRuntimeConfigService {
  async generate(instanceSlug: string) {
    const [row] = await db.select().from(instance).where(eq(instance.slug, instanceSlug)).limit(1)
    if (!row) {
      throw new Error(`Instance not found: ${instanceSlug}`)
    }

    const settings = await db
      .select({
        commandKey: command.commandKey,
        enabled: instanceCommand.enabled,
        ownerOnly: instanceCommand.ownerOnly,
        descriptionOverride: instanceCommand.descriptionOverride,
        disabledMessage: instanceCommand.disabledMessage,
        config: instanceCommand.config
      })
      .from(instanceCommand)
      .innerJoin(command, eq(command.id, instanceCommand.commandId))
      .where(eq(instanceCommand.instanceSlug, instanceSlug))

    const aliases = await db
      .select({
        commandId: instanceCommandAlias.commandId,
        commandKey: command.commandKey,
        alias: instanceCommandAlias.alias
      })
      .from(instanceCommandAlias)
      .innerJoin(command, eq(command.id, instanceCommandAlias.commandId))
      .where(eq(instanceCommandAlias.instanceSlug, instanceSlug))

    const commandConfig: Record<string, { enabled: boolean; ownerOnly: boolean; aliases: string[]; description?: string; disabledMessage?: string; config: Record<string, unknown> }> =
      {}

    for (const setting of settings) {
      commandConfig[setting.commandKey] = {
        enabled: setting.enabled,
        ownerOnly: setting.ownerOnly,
        aliases: aliases.filter((alias) => alias.commandKey === setting.commandKey).map((alias) => alias.alias),
        description: setting.descriptionOverride ?? undefined,
        disabledMessage: setting.disabledMessage ?? undefined,
        config: setting.config ?? {}
      }
    }

    const runtimeConfig = defineDeadByteConfig({
      mode: 'managed',
      instanceId: row.slug,
      clientId: row.clientId,
      sessionPath: row.sessionPath,
      prefixes: ['!', '.', '/', '#'],
      fallbackPrefixes: ['#'],
      owners: [],
      internalApi: {
        enabled: true,
        host: row.internalHost,
        port: row.internalPort ?? undefined
      },
      commands: commandConfig
    })

    await mkdir(dirname(row.runtimeConfigPath), { recursive: true })
    await writeFile(row.runtimeConfigPath, JSON.stringify(runtimeConfig, null, 2), 'utf8')
    return { path: row.runtimeConfigPath, config: runtimeConfig }
  }

  async validateAliases(instanceSlug: string, changes: Array<{ commandId: string; aliases: string[] }>) {
    const current = await db.select().from(instanceCommandAlias).where(eq(instanceCommandAlias.instanceSlug, instanceSlug))
    const aliases = new Map(current.map((item) => [item.normalizedAlias, item.commandId]))

    for (const change of changes) {
      for (const currentAlias of current.filter((item) => item.commandId === change.commandId)) {
        aliases.delete(currentAlias.normalizedAlias)
      }

      for (const alias of change.aliases) {
        const normalized = normalizeCommandName(alias)
        if (!normalized) {
          throw new Error('Alias cannot be empty.')
        }
        const existingCommandId = aliases.get(normalized)
        if (existingCommandId && existingCommandId !== change.commandId) {
          throw new Error(`Alias collision: ${alias}`)
        }
        aliases.set(normalized, change.commandId)
      }
    }
  }
}
