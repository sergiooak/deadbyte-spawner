import { eventHandler } from 'h3'
import { childProcessManager } from '../../../services/process/child-process-manager.js'
import { requireSlug, withHttpErrors } from '../../../utils/http.js'

export default eventHandler(async (event) => {
  const slug = requireSlug(event)
  return await withHttpErrors(() => childProcessManager.start(slug))
})
