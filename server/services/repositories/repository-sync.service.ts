import { eq } from 'drizzle-orm'
import { db } from '../../db/client.js'
import { instance } from '../../db/schema/index.js'
import { spawnerPaths } from '../../utils/paths.js'
import { GitService } from '../git/git.service.js'
import { InstanceService } from '../instances/instance.service.js'
import { CommandSyncService, type CommandSyncSummary } from './command-sync.service.js'
import { RepositoryManifestService } from './repository-manifest.service.js'
import { RepositoryService } from './repository.service.js'

export type RepositorySyncResult = CommandSyncSummary & {
  commitHash: string
  durationMs: number
}

const runningSyncs = new Map<string, Promise<RepositorySyncResult>>()

export class RepositorySyncService {
  isSyncing(slug: string): boolean {
    return runningSyncs.has(slug)
  }

  /**
   * Clona/atualiza, instala, builda, lê o manifesto e sincroniza os comandos.
   * Chamadas concorrentes para o mesmo repositório reaproveitam a execução em andamento.
   */
  async sync(slug: string): Promise<RepositorySyncResult> {
    const running = runningSyncs.get(slug)
    if (running) {
      return await running
    }

    const task = this.run(slug).finally(() => runningSyncs.delete(slug))
    runningSyncs.set(slug, task)
    return await task
  }

  private async run(slug: string): Promise<RepositorySyncResult> {
    const startedAt = Date.now()
    const repository = await new RepositoryService().get(slug)
    if (!repository) {
      throw new Error(`Repository not found: ${slug}`)
    }

    const path = spawnerPaths().repositoryPath(slug)
    const git = new GitService()
    await git.ensureRepository({ repositoryUrl: repository.repositoryUrl, branch: repository.defaultBranch, path })
    const commitHash = await git.currentCommit(path)

    const manifestService = new RepositoryManifestService()
    await manifestService.install(path, repository.installCommand)
    await manifestService.build(path, repository.buildCommand)
    const loaded = await manifestService.load(path, repository.manifestCommand)
    const summary = await new CommandSyncService().sync({
      repositorySlug: slug,
      branch: repository.defaultBranch,
      commitHash,
      manifestHash: loaded.manifestHash,
      manifest: loaded.manifest
    })

    // Instâncias existentes recebem os comandos novos do manifesto.
    const instances = await db.select({ slug: instance.slug }).from(instance).where(eq(instance.repositorySlug, slug))
    const instanceService = new InstanceService()
    for (const item of instances) {
      await instanceService.ensureCommands(item.slug)
    }
    await db
      .update(instance)
      .set({ commitHash, repositoryVersionId: summary.repositoryVersionId, updatedAt: new Date() })
      .where(eq(instance.repositorySlug, slug))

    return { ...summary, commitHash, durationMs: Date.now() - startedAt }
  }
}

export const repositorySyncService = new RepositorySyncService()
