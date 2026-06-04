import { createError, eventHandler, getRouterParam } from 'h3'
import { InstanceService } from '../../services/instances/instance.service.js'

export default eventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Missing slug.' })
  }
  const row = await new InstanceService().get(slug)
  if (!row) {
    throw createError({ statusCode: 404, statusMessage: 'Instance not found.' })
  }
  return row
})
