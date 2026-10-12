import { eq } from 'drizzle-orm'
import { db } from '../../db/client.js'
import { repository } from '../../db/schema/index.js'
import { readSpawnerEnv } from '../../utils/env.js'

export const OFFICIAL_REPOSITORY_SLUG = 'deadbyte-bot'

function sameRepository(a: string, b: string): boolean {
  const normalize = (url: string) => url.trim().toLowerCase().replace(/\.git$/, '').replace(/\/+$/, '')
  return normalize(a) === normalize(b)
}

/**
 * Garante que o repositório oficial (DEADBYTE_BOT_DEFAULT_REPOSITORY_URL) exista e esteja marcado.
 * Se já foi cadastrado com outro slug, só marca; senão cria com o slug padrão. Forks são cadastros comuns.
 */
export async function ensureOfficialRepository(): Promise<{ slug: string; created: boolean }> {
  const env = readSpawnerEnv()
  const url = env.DEADBYTE_BOT_DEFAULT_REPOSITORY_URL
  const rows = await db.select().from(repository)

  const match = rows.find((row) => sameRepository(row.repositoryUrl, url))
  for (const row of rows) {
    const shouldBeOfficial = row.slug === match?.slug
    if (row.official !== shouldBeOfficial) {
      await db.update(repository).set({ official: shouldBeOfficial, updatedAt: new Date() }).where(eq(repository.slug, row.slug))
    }
  }
  if (match) {
    return { slug: match.slug, created: false }
  }

  const slug = rows.some((row) => row.slug === OFFICIAL_REPOSITORY_SLUG) ? `${OFFICIAL_REPOSITORY_SLUG}-oficial` : OFFICIAL_REPOSITORY_SLUG
  await db.insert(repository).values({
    slug,
    name: 'DeadByte Bot',
    repositoryUrl: url,
    defaultBranch: env.DEADBYTE_BOT_DEFAULT_BRANCH,
    official: true
  })
  return { slug, created: true }
}
