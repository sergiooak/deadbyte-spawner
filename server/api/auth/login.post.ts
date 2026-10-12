import { createError, eventHandler, getRequestIP, readValidatedBody } from 'h3'
import { z } from 'zod'
import {
  adminPasswordProblem,
  clearFailedLogins,
  loginLockedUntil,
  registerFailedLogin,
  useAdminSession,
  verifyAdminPassword
} from '../../utils/auth.js'

const BodySchema = z.object({
  password: z.string().min(1).max(512)
})

export default eventHandler(async (event) => {
  const problem = adminPasswordProblem()
  if (problem) {
    throw createError({ statusCode: 503, statusMessage: problem })
  }

  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const lockedUntil = loginLockedUntil(ip)
  if (lockedUntil) {
    const minutes = Math.ceil((lockedUntil - Date.now()) / 60_000)
    throw createError({ statusCode: 429, statusMessage: `Muitas tentativas. Tente de novo em ${minutes} min.` })
  }

  const body = await readValidatedBody(event, (value) => BodySchema.parse(value))
  if (!verifyAdminPassword(body.password)) {
    registerFailedLogin(ip)
    // Atraso fixo para dificultar força bruta.
    await new Promise((resolve) => setTimeout(resolve, 800))
    throw createError({ statusCode: 401, statusMessage: 'Senha incorreta.' })
  }

  clearFailedLogins(ip)
  const session = await useAdminSession(event)
  await session.update({ authenticated: true, loggedInAt: Date.now() })
  return { ok: true }
})
