import { createError, eventHandler, getRouterParam } from 'h3'
import { spawnerPaths } from '../../../utils/paths.js'
import { GitService } from '../../../services/git/git.service.js'
import { CommandSyncService } from '../../../services/repositories/command-sync.service.js'
import { RepositoryManifestService } from '../../../services/repositories/repository-manifest.service.js'
import { RepositoryService } from '../../../services/repositories/repository.service.js'

export default eventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Missing slug.' })
  }
  const repository = await new RepositoryService().get(slug)
  if (!repository) {
    throw createError({ statusCode: 404, statusMessage: 'Repository not found.' })
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

  return summary
})
