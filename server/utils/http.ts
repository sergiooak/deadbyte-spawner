import { createError, getRouterParam, type H3Event } from 'h3'

export function requireSlug(event: H3Event): string {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Missing slug.' })
  }
  return slug
}

/** Converte erros de serviço em respostas legíveis para o painel. */
export async function withHttpErrors<T>(task: () => Promise<T>, statusCode = 400): Promise<T> {
  try {
    return await task()
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    const message = error instanceof Error ? error.message : String(error)
    throw createError({ statusCode, statusMessage: message.split('\n')[0]?.slice(0, 300) || 'Request failed.' })
  }
}
