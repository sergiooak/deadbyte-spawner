import { createError, eventHandler, getRouterParam } from 'h3'
import { InstanceService } from '../../../services/instances/instance.service.js'

export default eventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Missing slug.' })
  }
  return await new InstanceService().commands(slug)
})
