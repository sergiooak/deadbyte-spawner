import { desc, eq } from 'drizzle-orm'
import type { DeadByteRuntimeEvent } from '@deadbyte/runtime'
import { db } from '../../db/client.js'
import { instance, runtimeEvent } from '../../db/schema/index.js'

export class RuntimeEventService {
  async append(instanceSlug: string | null, event: DeadByteRuntimeEvent) {
    await db.insert(runtimeEvent).values({
      instanceSlug,
      eventName: event.name,
      level: event.level,
      message: event.message,
      payload: event.payload,
      error: event.error
    })

    if (!instanceSlug) {
      return
    }

    if (event.name === 'whatsapp.qr.generated') {
      await db
        .update(instance)
        .set({ status: 'waiting_qr', lastQr: typeof event.payload?.qr === 'string' ? event.payload.qr : null, updatedAt: new Date() })
        .where(eq(instance.slug, instanceSlug))
    }

    if (event.name === 'whatsapp.authenticated') {
      await db.update(instance).set({ status: 'authenticated', updatedAt: new Date() }).where(eq(instance.slug, instanceSlug))
    }

    if (event.name === 'whatsapp.ready') {
      await db
        .update(instance)
        .set({ status: 'ready', lastReadyAt: new Date(), lastHeartbeatAt: new Date(), updatedAt: new Date() })
        .where(eq(instance.slug, instanceSlug))
    }

    if (event.name === 'whatsapp.disconnected') {
      await db.update(instance).set({ status: 'disconnected', updatedAt: new Date() }).where(eq(instance.slug, instanceSlug))
    }

    if (event.name === 'whatsapp.auth_failure') {
      await db.update(instance).set({ status: 'error', updatedAt: new Date() }).where(eq(instance.slug, instanceSlug))
    }
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
