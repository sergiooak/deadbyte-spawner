import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

// Segredo por processo: tokens só valem enquanto este spawner estiver no ar.
const secret = randomBytes(32)
const TOKEN_TTL_MS = 60_000

function sign(payload: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

/** Token curto para abrir o WebSocket. Emitido por /api/realtime/token, que exige sessão. */
export function issueRealtimeToken(): string {
  const payload = String(Date.now() + TOKEN_TTL_MS)
  return `${payload}.${sign(payload)}`
}

export function verifyRealtimeToken(token: string | null | undefined): boolean {
  if (!token) return false
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return false
  const expected = Buffer.from(sign(payload))
  const received = Buffer.from(signature)
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return false
  return Number(payload) > Date.now()
}
