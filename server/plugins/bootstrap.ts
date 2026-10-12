import { spawnerLog } from '../utils/spawner-log.js'
import { childProcessManager } from '../services/process/child-process-manager.js'
import { adminPasswordProblem } from '../utils/auth.js'
import { ensureBootstrapped, pruneOldLogs, resumeInstances } from '../utils/bootstrap.js'

const PRUNE_INTERVAL_MS = 60 * 60 * 1000

export default defineNitroPlugin((nitroApp) => {
  // Durante `nuxt build` / prerender não há banco disponível.
  if (import.meta.prerender) {
    return
  }

  const passwordProblem = adminPasswordProblem()
  if (passwordProblem) {
    spawnerLog.warn({ event: 'auth.not_configured', why: passwordProblem, fix: 'Defina DEADBYTE_ADMIN_PASSWORD (16+ caracteres) no ambiente e reinicie.' })
  }

  void ensureBootstrapped()
    .then(() => resumeInstances())
    .catch(() => undefined)

  const pruneTimer = setInterval(() => {
    void pruneOldLogs().catch(() => undefined)
  }, PRUNE_INTERVAL_MS)
  pruneTimer.unref()

  nitroApp.hooks.hook('close', async () => {
    clearInterval(pruneTimer)
    await childProcessManager.stopAll()
  })
})
