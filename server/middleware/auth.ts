import { createError, defineEventHandler, getRequestHeader, getRequestHost, getRequestIP, getRequestURL, setResponseHeaders } from 'h3'
import { adminPasswordProblem, isAuthBypassed, isAuthenticated } from '../utils/auth.js'
import { ensureBootstrapped } from '../utils/bootstrap.js'

const PUBLIC_API_PATHS = new Set(['/api/health', '/api/auth/login', '/api/auth/logout', '/api/auth/session'])
const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1'])
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export default defineEventHandler(async (event) => {
  setResponseHeaders(event, {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin'
  })

  const { pathname } = getRequestURL(event)
  if (!pathname.startsWith('/api/')) {
    return
  }

  // Bloqueia requisições de escrita vindas de outro site (CSRF).
  if (!SAFE_METHODS.has(event.method)) {
    const origin = getRequestHeader(event, 'origin')
    if (origin) {
      const host = getRequestHost(event, { xForwardedHost: true })
      let originHost = ''
      try {
        originHost = new URL(origin).host
      } catch {
        // origin inválido cai na rejeição abaixo
      }
      if (originHost !== host) {
        throw createError({ statusCode: 403, statusMessage: 'Cross-origin request blocked.' })
      }
    }
  }

  if (pathname !== '/api/health') {
    await ensureBootstrapped()
  }

  if (PUBLIC_API_PATHS.has(pathname)) {
    return
  }

  // Rotas internas só aceitam chamadas dos bots rodando no mesmo container.
  if (pathname.startsWith('/api/internal/')) {
    const ip = getRequestIP(event) ?? ''
    if (!LOOPBACK.has(ip)) {
      throw createError({ statusCode: 403, statusMessage: 'Internal endpoint.' })
    }
    return
  }

  const problem = adminPasswordProblem()
  if (problem && !isAuthBypassed()) {
    throw createError({ statusCode: 503, statusMessage: problem })
  }

  if (!(await isAuthenticated(event))) {
    throw createError({ statusCode: 401, statusMessage: 'Não autenticado.' })
  }
})
