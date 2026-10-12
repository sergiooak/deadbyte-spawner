export default defineNuxtConfig({
  modules: ['@nuxt/ui'],
  // Painel administrativo atrás de login: não precisa de SSR.
  ssr: false,
  css: ['~/assets/css/main.css'],
  // Painel só em dark mode.
  colorMode: {
    preference: 'dark',
    fallback: 'dark',
    storageKey: 'deadbyte-color-mode'
  },
  devtools: { enabled: true },
  app: {
    head: {
      title: 'DeadByte Spawner',
      htmlAttrs: { lang: 'pt-BR' },
      meta: [
        { name: 'robots', content: 'noindex, nofollow' },
        { name: 'theme-color', content: '#0a0a0a' }
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }]
    }
  },
  icon: {
    // Ícones empacotados no build: o painel não depende da API pública do Iconify.
    serverBundle: { collections: ['lucide', 'simple-icons'] },
    clientBundle: { scan: true }
  },
  compatibilityDate: '2026-05-30'
})
