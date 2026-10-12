import type { RuntimeEvent } from '~/types'

export type RealtimeMessage =
  | { type: 'hello' | 'pong' }
  | { type: 'instance.status'; slug: string; status: string }
  | { type: 'instance.event'; slug: string; event: RuntimeEvent }
  | { type: 'instance.log'; slug: string; log: { stream: 'stdout' | 'stderr'; line: string; createdAt: string } }
  | { type: 'repository.sync'; slug: string; state: 'started' | 'finished' | 'failed'; message?: string }
  | { type: 'ack'; requestId: string; ok: boolean; result?: unknown; message?: string; why?: string; fix?: string }
  | { type: 'error'; message: string }

type Subscription = { slugs: () => string[]; logs: () => boolean; onMessage: (message: RealtimeMessage) => void }
type RealtimeAction = 'instance.start' | 'instance.stop' | 'instance.restart' | 'repository.sync'

// Uma conexão só por aba, compartilhada por todos os componentes.
const connected = ref(false)
const subscriptions = new Set<Subscription>()
const pending = new Map<string, { resolve: (value: unknown) => void; reject: (error: Error) => void }>()
let socket: WebSocket | null = null
let connecting = false
let retryMs = 1000
let heartbeat: ReturnType<typeof setInterval> | undefined

function send(payload: unknown) {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload))
}

function syncSubscriptions() {
  const all = [...subscriptions]
  // Lista vazia = todas as instâncias.
  const wantsAll = all.some((sub) => sub.slugs().length === 0)
  const slugs = wantsAll ? [] : [...new Set(all.flatMap((sub) => sub.slugs()))]
  send({ type: 'subscribe', slugs, logs: all.some((sub) => sub.logs()) })
}

async function connect() {
  if (import.meta.server || connecting || socket) return
  connecting = true
  try {
    const { token } = await $fetch<{ token: string }>('/api/realtime/token')
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
    socket = new WebSocket(`${protocol}://${location.host}/_ws?token=${encodeURIComponent(token)}`)
  } catch {
    connecting = false
    setTimeout(connect, retryMs)
    retryMs = Math.min(retryMs * 2, 30_000)
    return
  }
  connecting = false

  socket.onopen = () => {
    connected.value = true
    retryMs = 1000
    syncSubscriptions()
    heartbeat = setInterval(() => send({ type: 'ping' }), 25_000)
  }
  socket.onmessage = (event) => {
    let message: RealtimeMessage
    try {
      message = JSON.parse(String(event.data))
    } catch {
      return
    }
    if (message.type === 'ack') {
      const waiter = pending.get(message.requestId)
      pending.delete(message.requestId)
      if (message.ok) waiter?.resolve(message.result)
      else waiter?.reject(Object.assign(new Error(message.message ?? 'A ação falhou'), { data: { statusMessage: message.why ? `${message.message}: ${message.why}` : message.message } }))
      return
    }
    for (const sub of subscriptions) sub.onMessage(message)
  }
  socket.onclose = () => {
    connected.value = false
    clearInterval(heartbeat)
    socket = null
    for (const [id, waiter] of pending) {
      waiter.reject(new Error('Conexão em tempo real caiu'))
      pending.delete(id)
    }
    if (subscriptions.size) {
      setTimeout(connect, retryMs)
      retryMs = Math.min(retryMs * 2, 30_000)
    }
  }
}

/**
 * Atualizações em tempo real do spawner (WebSocket em /_ws), com polling só como reserva.
 * @param options.slugs instâncias de interesse (vazio = todas)
 * @param options.logs também recebe linhas de log (mais tráfego)
 */
export function useRealtime(options: { slugs?: () => string[]; logs?: () => boolean; onMessage?: (message: RealtimeMessage) => void } = {}) {
  const subscription: Subscription = {
    slugs: options.slugs ?? (() => []),
    logs: options.logs ?? (() => false),
    onMessage: options.onMessage ?? (() => undefined)
  }

  onMounted(() => {
    subscriptions.add(subscription)
    if (socket) syncSubscriptions()
    else void connect()
  })
  onBeforeUnmount(() => {
    subscriptions.delete(subscription)
    syncSubscriptions()
  })
  watch([subscription.slugs, subscription.logs], syncSubscriptions)

  /** Executa uma ação pelo WebSocket e espera a resposta. */
  function action(name: RealtimeAction, slug: string): Promise<unknown> {
    if (!connected.value) return Promise.reject(new Error('offline'))
    const requestId = crypto.randomUUID()
    return new Promise((resolve, reject) => {
      pending.set(requestId, { resolve, reject })
      send({ type: 'action', requestId, action: name, slug })
    })
  }

  return { connected, action }
}
