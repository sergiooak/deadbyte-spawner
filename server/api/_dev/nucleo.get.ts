import { readFileSync } from 'node:fs'
import { createError, defineEventHandler, getQuery } from 'h3'
import { useRuntimeConfig } from 'nitropack/runtime'

type SourceIcon = { name: string; tags: string }

let catalog: SourceIcon[] | undefined

// Mesma pontuação da CLI (nucleo search), para a página /dev/icons. Só existe em dev, com o catálogo local.
export default defineEventHandler((event) => {
  const source = String(useRuntimeConfig().nucleoSource ?? '')
  if (!source) {
    throw createError({ statusCode: 404, statusMessage: 'Catálogo Nucleo disponível só em dev, com icons/nucleo-source.json.' })
  }
  catalog ??= JSON.parse(readFileSync(source, 'utf8')).icons as SourceIcon[]
  const query = getQuery(event).q
  const terms = (typeof query === 'string' ? query : '').toLowerCase().split(/\s+/).filter(Boolean)
  if (!terms.length) return []

  return catalog
    .map((icon) => {
      const name = icon.name.toLowerCase()
      const tags = icon.tags.toLowerCase().split(',')
      let score = 0
      for (const term of terms) {
        if (name === term) score += 100
        else if (name.split('-').includes(term)) score += 60
        else if (name.includes(term)) score += 40
        if (tags.includes(term)) score += 30
        else if (tags.some((tag) => tag.includes(term))) score += 10
      }
      return { name: icon.name, tags: icon.tags, score }
    })
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, 72)
})
