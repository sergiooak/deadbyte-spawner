import { createError } from 'h3'
import { FetchError, ofetch } from 'ofetch'
import { InstanceService } from './instance.service.js'

/**
 * Chama a API interna (h3 + listhen) de um bot em execução, no mesmo container.
 * Erros do bot viram erros HTTP com a mesma mensagem.
 */
export async function callBotApi<T>(slug: string, path: string, options: { method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'; body?: Record<string, unknown> } = {}): Promise<T> {
  const instance = await new InstanceService().get(slug)
  if (!instance) {
    throw createError({ statusCode: 404, statusMessage: 'Instance not found.' })
  }
  if (!instance.internalPort) {
    throw createError({ statusCode: 409, statusMessage: 'Instance internal API is not configured.' })
  }

  try {
    return await ofetch<T>(`http://${instance.internalHost}:${instance.internalPort}${path}`, {
      method: options.method ?? 'GET',
      body: options.body,
      timeout: 30_000
    })
  } catch (error) {
    if (error instanceof FetchError && error.response) {
      throw createError({ statusCode: error.response.status, statusMessage: error.data?.statusMessage ?? error.message })
    }
    throw createError({ statusCode: 503, statusMessage: 'O bot não está respondendo. Ele está rodando?' })
  }
}
