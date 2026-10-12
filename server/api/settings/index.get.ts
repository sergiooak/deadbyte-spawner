import { eventHandler } from 'h3'
import { childProcessManager } from '../../services/process/child-process-manager.js'
import { readSpawnerEnv } from '../../utils/env.js'
import { spawnerPaths } from '../../utils/paths.js'

/** Informações de ambiente para o painel. Nunca devolve valores de segredos, só se estão definidos. */
export default eventHandler(() => {
  const env = readSpawnerEnv()
  const paths = spawnerPaths()
  const isSet = (name: string) => Boolean(process.env[name]?.trim())

  return {
    nodeVersion: process.version,
    platform: `${process.platform}/${process.arch}`,
    uptimeSeconds: Math.round(process.uptime()),
    runningInstances: childProcessManager.runningSlugs(),
    paths: {
      data: paths.dataDir,
      repos: paths.reposDir,
      instances: paths.instancesDir,
      sessions: paths.sessionsDir
    },
    bot: {
      defaultRepositoryUrl: env.DEADBYTE_BOT_DEFAULT_REPOSITORY_URL,
      defaultBranch: env.DEADBYTE_BOT_DEFAULT_BRANCH,
      internalHost: env.DEADBYTE_INTERNAL_HOST,
      portRange: `${env.DEADBYTE_INTERNAL_PORT_START}-${env.DEADBYTE_INTERNAL_PORT_END}`,
      chromePath: env.DEADBYTE_CHROME_PATH || null,
      ffmpegPath: env.FFMPEG_PATH || null,
      rembgUrl: process.env.DEADBYTE_REMBG_URL || null,
      logRetentionDays: Number(process.env.DEADBYTE_LOG_RETENTION_DAYS ?? 7)
    },
    secrets: {
      DEADBYTE_ADMIN_PASSWORD: isSet('DEADBYTE_ADMIN_PASSWORD'),
      DEADBYTE_TEXAS_API_KEY: isSet('DEADBYTE_TEXAS_API_KEY'),
      DEADBYTE_TYPESAFE_API_KEY: isSet('DEADBYTE_TYPESAFE_API_KEY'),
      DEADBYTE_OPENAI_API_KEY: isSet('DEADBYTE_OPENAI_API_KEY')
    }
  }
})
