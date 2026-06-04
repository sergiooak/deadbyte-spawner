import { eventHandler } from 'h3'
import { sql } from 'drizzle-orm'
import { db } from '../db/client.js'

export default eventHandler(async () => {
  try {
    await db.execute(sql`select 1`)
    return { ok: true, database: 'ok' }
  } catch (error) {
    return { ok: false, database: 'error', error: error instanceof Error ? error.message : String(error) }
  }
})
