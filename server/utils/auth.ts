import { createHash, timingSafeEqual } from 'node:crypto'
import { getRequestHeader, getRequestProtocol, useSession, type H3Event } from 'h3'

export type AdminSessionData = {
  authenticated?: boolean
  loggedInAt?: number
}

export const MIN_ADMIN_PASSWORD_LENGTH = 16
const SESSION_MAX_AGE = 60 * 60 * 24 * 7

const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_MS = 15 * 60 * 1000
const failedAttempts = new Map<string, { count: number; lockedUntil: number }>()

function rawAdminPassword(): string {
  return process.env.DEADBYTE_ADMIN_PASSWORD?.trim() ?? ''
}

/** Senhas curtas são tratadas como ausentes: o painel não abre com senha fraca. */
export function adminPasswordProblem(): string | undefined {
  const password = rawAdminPassword()
  if (!password) {
    return 'DEADBYTE_ADMIN_PASSWORD não está definida.'
  }
  if (password.length < MIN_ADMIN_PASSWORD_LENGTH) {
    return `DEADBYTE_ADMIN_PASSWORD precisa ter pelo menos ${MIN_ADMIN_PASSWORD_LENGTH} caracteres.`
  }
  return undefined
}

export function isAuthConfigured(): boolean {
  return adminPasswordProblem() === undefined
}

/**
 * Sem senha válida o painel só fica aberto fora de produção.
 * Em produção ele fica bloqueado até DEADBYTE_ADMIN_PASSWORD ser configurada.
 */
export function isAuthBypassed(): boolean {
  return !rawAdminPassword() && process.env.NODE_ENV !== 'production'
}

function sha256(value: string): Buffer {
  return createHash('sha256').update(value).digest()
}

export function verifyAdminPassword(candidate: string): boolean {
  if (!isAuthConfigured()) {
    return false
  }
  return timingSafeEqual(sha256(candidate), sha256(rawAdminPassword()))
}

export function loginLockedUntil(ip: string): number | undefined {
  const entry = failedAttempts.get(ip)
  if (entry && entry.lockedUntil > Date.now()) {
    return entry.lockedUntil
  }
  return undefined
}

export function registerFailedLogin(ip: string) {
  const entry = failedAttempts.get(ip) ?? { count: 0, lockedUntil: 0 }
  entry.count += 1
  if (entry.count >= MAX_FAILED_ATTEMPTS) {
    entry.count = 0
    entry.lockedUntil = Date.now() + LOCKOUT_MS
  }
  failedAttempts.set(ip, entry)
}

export function clearFailedLogins(ip: string) {
  failedAttempts.delete(ip)
}

// A chave da sessão deriva da senha: trocar a senha invalida todas as sessões.
function sessionSecret(): string {
  return createHash('sha256').update(`deadbyte-spawner-session:${rawAdminPassword()}`).digest('hex')
}

export async function useAdminSession(event: H3Event) {
  return await useSession<AdminSessionData>(event, {
    name: 'deadbyte_session',
    password: sessionSecret(),
    maxAge: SESSION_MAX_AGE,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: getRequestProtocol(event, { xForwardedProto: true }) === 'https'
    }
  })
}

export async function isAuthenticated(event: H3Event): Promise<boolean> {
  if (isAuthBypassed()) {
    return true
  }
  if (!isAuthConfigured()) {
    return false
  }
  const session = await useAdminSession(event)
  return session.data.authenticated === true
}

/**
 * Token só leitura para a API de logs (/api/logs/*), usado por revisões automáticas (ex.: Claude Code).
 * Não dá acesso a nenhuma outra rota. Exige 32+ caracteres.
 */
export function hasValidLogsToken(event: H3Event): boolean {
  const expected = process.env.DEADBYTE_LOGS_TOKEN?.trim() ?? ''
  if (expected.length < 32) return false
  const header = getRequestHeader(event, 'authorization') ?? ''
  const received = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  return received.length > 0 && timingSafeEqual(sha256(received), sha256(expected))
}
