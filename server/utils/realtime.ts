import { EventEmitter } from 'node:events'

/**
 * Barramento em memória do que acontece com as instâncias. O WebSocket do painel
 * (server/routes/_ws.ts) assina e empurra para o navegador na hora, sem polling.
 */
export type RealtimeMessage =
  | { type: 'instance.status'; slug: string; status: string }
  | { type: 'instance.event'; slug: string; event: Record<string, unknown> }
  | { type: 'instance.log'; slug: string; log: { id?: number; stream: 'stdout' | 'stderr'; line: string; createdAt: string } }
  | { type: 'repository.sync'; slug: string; state: 'started' | 'finished' | 'failed'; message?: string }

const bus = new EventEmitter()
bus.setMaxListeners(200)

export function publish(message: RealtimeMessage): void {
  bus.emit('message', message)
}

export function subscribe(listener: (message: RealtimeMessage) => void): () => void {
  bus.on('message', listener)
  return () => bus.off('message', listener)
}
