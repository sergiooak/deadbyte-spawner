export default defineNuxtRouteMiddleware(async (to) => {
  const { authenticated, refresh } = useAuth()

  if (authenticated.value === null) {
    try {
      await refresh()
    } catch {
      authenticated.value = false
    }
  }

  if (to.path === '/login') {
    if (authenticated.value) {
      return navigateTo(typeof to.query.redirect === 'string' ? to.query.redirect : '/')
    }
    return
  }

  if (!authenticated.value) {
    return navigateTo({ path: '/login', query: to.fullPath !== '/' ? { redirect: to.fullPath } : undefined })
  }
})
