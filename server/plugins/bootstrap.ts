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
    console.warn(`[spawner] ${passwordProblem} O painel fica bloqueado em produção.`)
  }

  void ensureBootstrapped()
    .then(() => {
      console.info('[spawner] database migrations applied.')
      return resumeInstances()
    })
    .catch((error) => console.error('[spawner] bootstrap failed:', error))

  const pruneTimer = setInterval(() => {
    void pruneOldLogs().catch((error) => console.error('[spawner] log pruning failed:', error))
  }, PRUNE_INTERVAL_MS)
  pruneTimer.unref()

  nitroApp.hooks.hook('close', async () => {
    clearInterval(pruneTimer)
    await childProcessManager.stopAll()
  })
})
