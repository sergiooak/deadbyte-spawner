import { mkdir } from 'node:fs/promises'
import { simpleGit } from 'simple-git'

export class GitService {
  async ensureRepository(options: { repositoryUrl: string; branch: string; path: string }) {
    await mkdir(options.path, { recursive: true })
    const git = simpleGit()
    const isRepo = await simpleGit(options.path).checkIsRepo().catch(() => false)

    if (!isRepo) {
      await git.clone(options.repositoryUrl, options.path, ['--branch', options.branch])
    }

    const repo = simpleGit(options.path)
    await repo.fetch()
    await repo.checkout(options.branch)
    await repo.reset(['--hard', `origin/${options.branch}`])
    return repo
  }

  async currentCommit(path: string): Promise<string> {
    return await simpleGit(path).revparse(['HEAD'])
  }
}
