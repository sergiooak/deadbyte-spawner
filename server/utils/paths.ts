import { join, resolve } from 'pathe'
import { readSpawnerEnv } from './env.js'

export function spawnerPaths() {
  const env = readSpawnerEnv()
  const root = resolve(process.cwd())
  return {
    dataDir: resolve(root, env.DEADBYTE_DATA_DIR),
    reposDir: resolve(root, env.DEADBYTE_REPOS_DIR),
    instancesDir: resolve(root, env.DEADBYTE_INSTANCES_DIR),
    sessionsDir: resolve(root, env.DEADBYTE_SESSIONS_DIR),
    logsDir: resolve(root, env.DEADBYTE_LOGS_DIR),
    repositoryPath: (slug: string) => join(resolve(root, env.DEADBYTE_REPOS_DIR), slug),
    instancePath: (slug: string) => join(resolve(root, env.DEADBYTE_INSTANCES_DIR), slug),
    sessionPath: (slug: string) => join(resolve(root, env.DEADBYTE_SESSIONS_DIR), slug),
    runtimeConfigPath: (slug: string) => join(resolve(root, env.DEADBYTE_INSTANCES_DIR), slug, 'runtime.config.json')
  }
}
