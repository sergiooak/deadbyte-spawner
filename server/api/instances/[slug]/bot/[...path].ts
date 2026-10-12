import { createError, eventHandler, getRouterParam, readBody } from 'h3'
import { callBotApi } from '../../../../services/instances/bot-internal-api.js'
import { requireSlug } from '../../../../utils/http.js'

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

// Só estas rotas da API interna do bot ficam acessíveis pelo painel.
const ALLOWED: Array<{ method: Method; pattern: RegExp }> = [
  { method: 'GET', pattern: /^profile$/ },
  { method: 'PATCH', pattern: /^profile$/ },
  { method: 'PUT', pattern: /^profile\/picture$/ },
  { method: 'DELETE', pattern: /^profile\/picture$/ },
  { method: 'GET', pattern: /^settings$/ },
  { method: 'PATCH', pattern: /^settings$/ },
  { method: 'GET', pattern: /^chats$/ },
  { method: 'GET', pattern: /^chats\/[^/]+$/ },
  { method: 'POST', pattern: /^chats\/[^/]+\/messages$/ },
  { method: 'POST', pattern: /^chats\/[^/]+\/actions$/ },
  { method: 'PATCH', pattern: /^chats\/[^/]+\/group$/ },
  { method: 'GET', pattern: /^chats\/[^/]+\/invite-link$/ }
]

/**
 * Controle remoto: repassa perfil, configurações e chats para a API interna do bot em execução.
 * Nada é salvo no banco: chats, nomes e números só passam pela resposta (LGPD: minimização).
 */
export default eventHandler(async (event) => {
  const slug = requireSlug(event)
  const path = getRouterParam(event, 'path') ?? ''
  const method = event.method as Method
  if (!ALLOWED.some((rule) => rule.method === method && rule.pattern.test(path))) {
    throw createError({ statusCode: 404, statusMessage: 'Rota de controle desconhecida.' })
  }

  const body = method === 'GET' || method === 'DELETE' ? undefined : await readBody<Record<string, unknown>>(event)
  // Os ids de chat têm @ e :, então seguem codificados até a API do bot.
  const target = '/' + path.split('/').map((segment) => encodeURIComponent(decodeURIComponent(segment))).join('/')
  return await callBotApi(slug, target, { method, body })
})
