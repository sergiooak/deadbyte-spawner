import { createError, eventHandler, getRouterParam } from 'h3'
import { childProcessManager } from '../../../services/process/child-process-manager.js'

export default eventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Missing slug.' })
  }
  return await childProcessManager.stop(slug)
})
