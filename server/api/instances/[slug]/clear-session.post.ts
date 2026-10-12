import { eventHandler } from 'h3'
import { childProcessManager } from '../../../services/process/child-process-manager.js'
import { SessionService } from '../../../services/sessions/session.service.js'
import { requireSlug, withHttpErrors } from '../../../utils/http.js'

export default eventHandler(async (event) => {
  const slug = requireSlug(event)
  return await withHttpErrors(async () => {
    // O Chromium mantém a pasta da sessão travada enquanto o bot roda.
    await childProcessManager.stop(slug)
    await new SessionService().clear(slug)
    return { ok: true }
  })
})
