import { createError, eventHandler, getRouterParam } from 'h3'
import QRCode from 'qrcode'
import { InstanceService } from '../../../services/instances/instance.service.js'

export default eventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Missing slug.' })
  }
  const row = await new InstanceService().get(slug)
  const svg = row?.lastQr ? await QRCode.toString(row.lastQr, { type: 'svg' }) : null
  return { qr: row?.lastQr ?? null, svg }
})
