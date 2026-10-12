import { desc, eq } from 'drizzle-orm'
import type { DeadByteRuntimeEvent } from '@deadbyte/runtime'
import { db } from '../../db/client.js'
import { instance, runtimeEvent } from '../../db/schema/index.js'
import { publish } from '../../utils/realtime.js'

const STATUS_BY_EVENT: Record<string, string> = {
  'whatsapp.qr.generated': 'waiting_qr',
  'whatsapp.authenticated': 'authenticated',
  'whatsapp.ready': 'ready',
  'whatsapp.disconnected': 'disconnected',
  'whatsapp.auth_failure': 'error'
}

export class RuntimeEventService {
  async append(instanceSlug: string | null, event: DeadByteRuntimeEvent) {
    const [stored] = await db.insert(runtimeEvent).values({
      instanceSlug,
      eventName: event.name,
      level: event.level,
      message: event.message,
      payload: event.payload,
      error: event.error
    }).returning()

    if (!instanceSlug) {
      return stored
    }

    const nextStatus = STATUS_BY_EVENT[event.name]
    if (nextStatus) {
      publish({ type: 'instance.status', slug: instanceSlug, status: nextStatus })
    }

    if (event.name === 'whatsapp.qr.generated') {
      await db
        .update(instance)
        .set({ status: 'waiting_qr', lastQr: typeof event.payload?.qr === 'string' ? event.payload.qr : null, updatedAt: new Date() })
        .where(eq(instance.slug, instanceSlug))
    }

    if (event.name === 'whatsapp.authenticated') {
      await db.update(instance).set({ status: 'authenticated', lastQr: null, updatedAt: new Date() }).where(eq(instance.slug, instanceSlug))
    }

    if (event.name === 'whatsapp.ready') {
      await db
        .update(instance)
        .set({ status: 'ready', lastQr: null, lastReadyAt: new Date(), lastHeartbeatAt: new Date(), updatedAt: new Date() })
        .where(eq(instance.slug, instanceSlug))
    }

    if (event.name === 'whatsapp.disconnected') {
      await db.update(instance).set({ status: 'disconnected', updatedAt: new Date() }).where(eq(instance.slug, instanceSlug))
    }

    if (event.name === 'whatsapp.auth_failure') {
      await db.update(instance).set({ status: 'error', updatedAt: new Date() }).where(eq(instance.slug, instanceSlug))
    }

    return stored
  }

  async list(instanceSlug: string, limit = 200) {
    return await db
      .select()
      .from(runtimeEvent)
      .where(eq(runtimeEvent.instanceSlug, instanceSlug))
      .orderBy(desc(runtimeEvent.createdAt))
      .limit(limit)
  }
}
