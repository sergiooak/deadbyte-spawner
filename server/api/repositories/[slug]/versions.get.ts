import { eventHandler } from 'h3'
import { desc, eq } from 'drizzle-orm'
import { db } from '../../../db/client.js'
import { repositoryVersion } from '../../../db/schema/index.js'
import { requireSlug } from '../../../utils/http.js'

export default eventHandler(async (event) => {
  const slug = requireSlug(event)
  return await db
    .select({
      id: repositoryVersion.id,
      branch: repositoryVersion.branch,
      commitHash: repositoryVersion.commitHash,
      version: repositoryVersion.version,
      manifestHash: repositoryVersion.manifestHash,
      createdAt: repositoryVersion.createdAt
    })
    .from(repositoryVersion)
    .where(eq(repositoryVersion.repositorySlug, slug))
    .orderBy(desc(repositoryVersion.createdAt))
    .limit(20)
})
