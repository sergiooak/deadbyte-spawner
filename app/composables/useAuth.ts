import type { AuthSession } from '~/types'

export function useAuth() {
  const authenticated = useState<boolean | null>('auth:authenticated', () => null)
  const session = useState<AuthSession | null>('auth:session', () => null)

  async function refresh() {
    session.value = await $fetch<AuthSession>('/api/auth/session')
    authenticated.value = session.value.authenticated
    return session.value
  }

  async function login(password: string) {
    await $fetch('/api/auth/login', { method: 'POST', body: { password } })
    await refresh()
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    authenticated.value = false
    await navigateTo('/login')
  }

  return { authenticated, session, refresh, login, logout }
}
