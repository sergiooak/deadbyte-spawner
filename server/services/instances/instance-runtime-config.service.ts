import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'pathe'
import { eq } from 'drizzle-orm'
import { defineDeadByteConfig, normalizeCommandName } from '@deadbyte/runtime'
import { db } from '../../db/client.js'
import { command, commandAlias, instance, instanceCommand, instanceCommandAlias } from '../../db/schema/index.js'

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

  /**
   * Impede que um alias editado colida com o de outro comando.
   * Aliases que o próprio manifesto compartilha entre comandos continuam permitidos,
   * porque o match() de cada comando desempata.
   */
  async validateAliases(instanceSlug: string, changes: Array<{ commandId: string; aliases: string[] }>) {
    const [row] = await db.select({ repositorySlug: instance.repositorySlug }).from(instance).where(eq(instance.slug, instanceSlug)).limit(1)
    const defaults = row ? await db.select().from(commandAlias).where(eq(commandAlias.repositorySlug, row.repositorySlug)) : []
    const sharedByManifest = new Map<string, Set<string>>()
    for (const item of defaults) {
      sharedByManifest.set(item.normalizedAlias, (sharedByManifest.get(item.normalizedAlias) ?? new Set()).add(item.commandId))
    }

    const current = await db.select().from(instanceCommandAlias).where(eq(instanceCommandAlias.instanceSlug, instanceSlug))
    const owners = new Map<string, Set<string>>()
    for (const item of current) {
      owners.set(item.normalizedAlias, (owners.get(item.normalizedAlias) ?? new Set()).add(item.commandId))
    }

    for (const change of changes) {
      for (const set of owners.values()) {
        set.delete(change.commandId)
      }

      for (const alias of change.aliases) {
        const normalized = normalizeCommandName(alias)
        if (!normalized) {
          throw new Error('Alias cannot be empty.')
        }
        const allowed = sharedByManifest.get(normalized)
        const conflicting = [...(owners.get(normalized) ?? [])].filter((id) => id !== change.commandId && !(allowed?.has(id) && allowed.has(change.commandId)))
        if (conflicting.length) {
          throw new Error(`O alias "${alias}" já é usado por outro comando.`)
        }
        owners.set(normalized, (owners.get(normalized) ?? new Set()).add(change.commandId))
      }
    }
  }
}
