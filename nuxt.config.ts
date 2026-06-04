export default defineNuxtConfig({
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  devtools: { enabled: true },
  compatibilityDate: '2026-05-30',
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL,
    deadbyte: {
      dataDir: process.env.DEADBYTE_DATA_DIR ?? './.deadbyte',
      reposDir: process.env.DEADBYTE_REPOS_DIR ?? './.deadbyte/repos',
      instancesDir: process.env.DEADBYTE_INSTANCES_DIR ?? './.deadbyte/instances',
      sessionsDir: process.env.DEADBYTE_SESSIONS_DIR ?? './.deadbyte/sessions',
      logsDir: process.env.DEADBYTE_LOGS_DIR ?? './.deadbyte/logs',
      defaultRepositoryUrl: process.env.DEADBYTE_BOT_DEFAULT_REPOSITORY_URL ?? 'https://github.com/sergiooak/deadbyte-bot.git',
      defaultBranch: process.env.DEADBYTE_BOT_DEFAULT_BRANCH ?? 'master',
      internalHost: process.env.DEADBYTE_INTERNAL_HOST ?? '127.0.0.1',
      internalPortStart: Number(process.env.DEADBYTE_INTERNAL_PORT_START ?? 41000),
      internalPortEnd: Number(process.env.DEADBYTE_INTERNAL_PORT_END ?? 41999)
    }
  }
})
