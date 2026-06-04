import { z } from 'zod'

export const SpawnerEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  DEADBYTE_DATA_DIR: z.string().default('./.deadbyte'),
  DEADBYTE_REPOS_DIR: z.string().default('./.deadbyte/repos'),
  DEADBYTE_INSTANCES_DIR: z.string().default('./.deadbyte/instances'),
  DEADBYTE_SESSIONS_DIR: z.string().default('./.deadbyte/sessions'),
  DEADBYTE_LOGS_DIR: z.string().default('./.deadbyte/logs'),
  DEADBYTE_BOT_DEFAULT_REPOSITORY_URL: z.string().url().default('https://github.com/sergiooak/deadbyte-bot.git'),
  DEADBYTE_BOT_DEFAULT_BRANCH: z.string().default('main'),
  DEADBYTE_INTERNAL_HOST: z.string().default('127.0.0.1'),
  DEADBYTE_INTERNAL_PORT_START: z.coerce.number().int().default(41000),
  DEADBYTE_INTERNAL_PORT_END: z.coerce.number().int().default(41999),
  DEADBYTE_CHROME_PATH: z.string().optional(),
  FFMPEG_PATH: z.string().optional(),
  FFPROBE_PATH: z.string().optional()
})

export type SpawnerEnv = z.infer<typeof SpawnerEnvSchema>

export function readSpawnerEnv(env: NodeJS.ProcessEnv = process.env): SpawnerEnv {
  return SpawnerEnvSchema.parse({
    DATABASE_URL: env.DATABASE_URL ?? 'postgres://deadbyte:deadbyte@localhost:5432/deadbyte',
    DEADBYTE_DATA_DIR: env.DEADBYTE_DATA_DIR,
    DEADBYTE_REPOS_DIR: env.DEADBYTE_REPOS_DIR,
    DEADBYTE_INSTANCES_DIR: env.DEADBYTE_INSTANCES_DIR,
    DEADBYTE_SESSIONS_DIR: env.DEADBYTE_SESSIONS_DIR,
    DEADBYTE_LOGS_DIR: env.DEADBYTE_LOGS_DIR,
    DEADBYTE_BOT_DEFAULT_REPOSITORY_URL: env.DEADBYTE_BOT_DEFAULT_REPOSITORY_URL,
    DEADBYTE_BOT_DEFAULT_BRANCH: env.DEADBYTE_BOT_DEFAULT_BRANCH,
    DEADBYTE_INTERNAL_HOST: env.DEADBYTE_INTERNAL_HOST,
    DEADBYTE_INTERNAL_PORT_START: env.DEADBYTE_INTERNAL_PORT_START,
    DEADBYTE_INTERNAL_PORT_END: env.DEADBYTE_INTERNAL_PORT_END,
    DEADBYTE_CHROME_PATH: env.DEADBYTE_CHROME_PATH,
    FFMPEG_PATH: env.FFMPEG_PATH,
    FFPROBE_PATH: env.FFPROBE_PATH
  })
}
