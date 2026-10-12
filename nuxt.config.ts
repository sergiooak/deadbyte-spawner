import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { toCollection } from './icons/collection.mjs'

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url))
const nucleoSource = fromRoot('./icons/nucleo-source.json')
const hasNucleoSource = existsSync(nucleoSource)

// Coleção Iconify do Nucleo Pixel. Em produção: só os ícones usados (cli/nucleo.mjs build), porque o
// repo é público e a licença do Nucleo não permite publicar o catálogo. Em dev, com o catálogo local,
// qualquer ícone aparece na hora (HMR) e a página /dev/icons funciona (ver $development abaixo).
const nucleoUsed = JSON.parse(readFileSync(fromRoot('./icons/nucleo.json'), 'utf8'))

// Ícones internos do Nuxt UI (app.config.ts > ui.icons). Entram fixos no bundle do cliente porque
// o scan não enxerga o app.config, e sem isso eles piscam na navegação.
const nuxtUiIcons = (JSON.parse(readFileSync(fromRoot('./icons/ui-icons.json'), 'utf8')) as string[]).map(
  (name) => `nucleo:${name}`
)

export default defineNuxtConfig({
  modules: ['@nuxt/ui', 'evlog/nuxt'],
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
        { name: 'theme-color', content: '#000000' },
        { property: 'og:title', content: 'DeadByte Spawner' },
        { property: 'og:description', content: 'Painel dos bots de figurinhas DeadByte.' },
        { property: 'og:image', content: '/brand/web/og-image.jpg' }
      ],
      // Arquivos do brandbook em public/brand/ (prompts em brand/PROMPTS.md)
      link: [
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/brand/favicon-32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/brand/favicon-16.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/brand/apple-touch-icon.png' }
      ]
    }
  },
  icon: {
    // SVG inline: permite shape-rendering crispEdges, que mantém o traço pixel nítido em qualquer tamanho.
    mode: 'svg',
    // Sem SSR o @nuxt/icon troca o provider padrão e empacota a coleção customizada inteira no cliente.
    // Com 'server', o cliente leva só os ícones do scan e busca o resto em /api/_nuxt_icon.
    provider: 'server',
    serverBundle: { collections: ['simple-icons'] },
    clientBundle: {
      icons: nuxtUiIcons,
      scan: true,
      includeCustomCollections: false,
      sizeLimitKb: 256
    }
  },
  // Logs estruturados (wide events): um por requisição da API, mais as operações internas.
  // Destino em server/plugins/evlog.ts; formato e roteiro de revisão em LOGS.md.
  evlog: {
    env: { service: 'deadbyte-spawner' },
    include: ['/api/**'],
    exclude: ['/api/_nuxt_icon/**', '/api/health', '/api/_dev/**'],
    redact: {
      builtins: ['email', 'creditCard', 'jwt', 'bearer', 'iban'],
      paths: ['body.password', 'password', 'body.media', 'media.base64', 'base64']
    },
    sampling: {
      // O painel faz polling a cada poucos segundos: guarda 10% das leituras normais.
      rates: { info: 10, debug: 0 },
      // Sempre guarda erros e lentidão. Escritas são forçadas no hook evlog:emit:keep.
      keep: [{ status: 400 }, { duration: 1500 }]
    }
  },
  fonts: {
    families: [
      { name: 'Pixelify Sans', provider: 'google', weights: [400, 500, 600, 700] },
      { name: 'Chakra Petch', provider: 'google', weights: [400, 500, 600, 700] },
      { name: 'JetBrains Mono', provider: 'google', weights: [400, 500, 700] }
    ]
  },
  runtimeConfig: {
    nucleoSource: ''
  },
  // A coleção entra por ambiente: arrays em $development/$production são concatenados com a base.
  $production: {
    icon: { customCollections: [nucleoUsed] }
  },
  $development: hasNucleoSource
    ? {
        icon: { customCollections: [toCollection(JSON.parse(readFileSync(nucleoSource, 'utf8')).icons)] },
        runtimeConfig: { nucleoSource }
      }
    : { icon: { customCollections: [nucleoUsed] } },
  // WebSocket do painel (server/routes/_ws.ts): status, eventos e logs em tempo real.
  nitro: {
    experimental: { websocket: true }
  },
  compatibilityDate: '2026-05-30'
})
