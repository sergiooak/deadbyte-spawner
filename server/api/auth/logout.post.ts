import { eventHandler } from 'h3'
import { isAuthConfigured, useAdminSession } from '../../utils/auth.js'

export default eventHandler(async (event) => {
  if (isAuthConfigured()) {
    const session = await useAdminSession(event)
    await session.clear()
  }
  return { ok: true }
})
