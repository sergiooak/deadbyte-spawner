import { and, eq, notInArray } from 'drizzle-orm'
import { normalizeCommandName, type DeadByteBotManifest } from '@deadbyte/runtime'
import { db } from '../../db/client.js'
import { command, commandAlias, repositoryVersion } from '../../db/schema/index.js'

export type CommandSyncSummary = {
  addedCommands: number
  updatedCommands: number
  removedCommands: number
  aliasesCount: number
  repositoryVersionId: string
}

export class CommandSyncService {
  async sync(input: {
    repositorySlug: string
    branch: string
    commitHash: string
    manifestHash: string
    manifest: DeadByteBotManifest
  }): Promise<CommandSyncSummary> {
    return await db.transaction(async (tx) => {
      const [version] = await tx
        .insert(repositoryVersion)
        .values({
          repositorySlug: input.repositorySlug,
          branch: input.branch,
          commitHash: input.commitHash,
          version: input.manifest.version,
          manifestHash: input.manifestHash,
          manifestJson: input.manifest
        })
        .onConflictDoUpdate({
          target: [repositoryVersion.repositorySlug, repositoryVersion.commitHash],
          set: {
            manifestHash: input.manifestHash,
            manifestJson: input.manifest,
            version: input.manifest.version
          }
        })
        .returning()

      if (!version) {
        throw new Error('Repository version could not be created.')
      }

      let addedCommands = 0
      let updatedCommands = 0
      let aliasesCount = 0
      const commandKeys = input.manifest.commands.map((item) => item.id)

      await tx.delete(commandAlias).where(eq(commandAlias.repositorySlug, input.repositorySlug))

      for (const manifestCommand of input.manifest.commands) {
        const existing = await tx
          .select()
          .from(command)
          .where(and(eq(command.repositorySlug, input.repositorySlug), eq(command.commandKey, manifestCommand.id)))
          .limit(1)

        const values = {
          repositorySlug: input.repositorySlug,
          commandKey: manifestCommand.id,
          group: manifestCommand.group,
          name: manifestCommand.name,
          description: manifestCommand.description,
          defaultEnabled: manifestCommand.enabledByDefault,
          defaultOwnerOnly: manifestCommand.ownerOnlyByDefault,
          supportsPrivate: manifestCommand.supports.private,
          supportsGroups: manifestCommand.supports.groups,
          supportsImplicit: manifestCommand.supports.implicit,
          configFields: manifestCommand.configFields,
          status: 'active',
          firstSeenVersionId: existing[0]?.firstSeenVersionId ?? version.id,
          lastSeenVersionId: version.id,
          updatedAt: new Date()
        }

        const [row] = await tx
          .insert(command)
          .values(values)
          .onConflictDoUpdate({
            target: [command.repositorySlug, command.commandKey],
            set: values
          })
          .returning()

        if (!row) {
          continue
        }

        if (existing.length) {
          updatedCommands += 1
        } else {
          addedCommands += 1
        }

        // Variantes com e sem acento (ex.: "música"/"musica") viram um único alias normalizado.
        const uniqueAliases = new Map<string, string>()
        for (const alias of manifestCommand.aliases) {
          const normalized = normalizeCommandName(alias)
          if (normalized && !uniqueAliases.has(normalized)) {
            uniqueAliases.set(normalized, alias)
          }
        }
        for (const [normalizedAlias, alias] of uniqueAliases) {
          await tx.insert(commandAlias).values({
            repositorySlug: input.repositorySlug,
            commandId: row.id,
            alias,
            normalizedAlias
          })
          aliasesCount += 1
        }
      }

      let removedCommands = 0
      if (commandKeys.length) {
        const removed = await tx
          .update(command)
          .set({ status: 'removed', updatedAt: new Date() })
          .where(and(eq(command.repositorySlug, input.repositorySlug), notInArray(command.commandKey, commandKeys)))
          .returning()
        removedCommands = removed.length
      }

      return {
        addedCommands,
        updatedCommands,
        removedCommands,
        aliasesCount,
        repositoryVersionId: version.id
      }
    })
  }
}
