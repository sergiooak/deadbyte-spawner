import { eq } from 'drizzle-orm'
import { rm } from 'node:fs/promises'
import { db } from '../../db/client.js'
import { repository } from '../../db/schema/index.js'
import { spawnerPaths } from '../../utils/paths.js'

export class RepositoryService {
  async list() {
    return await db.select().from(repository)
  }

  async get(slug: string) {
    const [row] = await db.select().from(repository).where(eq(repository.slug, slug)).limit(1)
    return row
  }

  async create(input: {
    slug: string
    name: string
    repositoryUrl: string
    defaultBranch: string
    installCommand?: string
    buildCommand?: string
    startCommand?: string
    manifestCommand?: string
  }) {
    const [row] = await db
      .insert(repository)
      .values({
        slug: input.slug,
        name: input.name,
        repositoryUrl: input.repositoryUrl,
        defaultBranch: input.defaultBranch,
        installCommand: input.installCommand,
        buildCommand: input.buildCommand,
        startCommand: input.startCommand,
        manifestCommand: input.manifestCommand
      })
      .returning()
    return row
  }

  async update(slug: string, patch: Partial<{ name: string; repositoryUrl: string; defaultBranch: string }>) {
    const [row] = await db
      .update(repository)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(repository.slug, slug))
      .returning()
    return row
  }

  async delete(slug: string) {
    await db.delete(repository).where(eq(repository.slug, slug))
    const repoPath = spawnerPaths().repositoryPath(slug)
    await rm(repoPath, { recursive: true, force: true })
  }
}
