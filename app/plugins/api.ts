export default defineNuxtPlugin(() => {
  const api = $fetch.create({
    async onResponseError({ response }) {
      if (response.status === 401 && useRoute().path !== '/login') {
        useState<boolean | null>('auth:authenticated').value = false
        await navigateTo({ path: '/login', query: { redirect: useRoute().fullPath } })
      }
    }
  })

  return { provide: { api } }
})
