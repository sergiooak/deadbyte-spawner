import { spawnerLog } from '../utils/spawner-log.js'
import { z } from 'zod'
import { childProcessManager } from '../services/process/child-process-manager.js'
import { repositorySyncService } from '../services/repositories/repository-sync.service.js'
import { subscribe, type RealtimeMessage } from '../utils/realtime.js'
import { verifyRealtimeToken } from '../utils/realtime-token.js'

/**
 * Canal em tempo real entre painel e spawner.
 * - Servidor → painel: status, eventos, linhas de log e progresso de sync assim que acontecem.
 * - Painel → servidor: assinatura de instâncias e ações (start/stop/restart/sync) com resposta.
 */
const ClientMessage = z.discriminatedUnion('type', [
  z.object({ type: z.literal('subscribe'), slugs: z.array(z.string()).max(100), logs: z.boolean().optional() }),
  z.object({ type: z.literal('ping') }),
  z.object({
    type: z.literal('action'),
    requestId: z.string().max(64),
    action: z.enum(['instance.start', 'instance.stop', 'instance.restart', 'repository.sync']),
    slug: z.string().min(1)
  })
])

type PeerState = { slugs: Set<string>; logs: boolean; unsubscribe: () => void }
const peers = new Map<string, PeerState>()

function wants(state: PeerState, message: RealtimeMessage): boolean {
  if (message.type === 'repository.sync') return true
  if (message.type === 'instance.log' && !state.logs) return false
  return state.slugs.size === 0 || state.slugs.has(message.slug)
}

export default defineWebSocketHandler({
  upgrade(request) {
    const token = new URL(request.url).searchParams.get('token')
    if (!verifyRealtimeToken(token)) {
      throw new Response('Unauthorized', { status: 401 })
    }
  },

  open(peer) {
    const state: PeerState = { slugs: new Set(), logs: false, unsubscribe: () => undefined }
    state.unsubscribe = subscribe((message) => {
      if (wants(state, message)) peer.send(JSON.stringify(message))
    })
    peers.set(peer.id, state)
    peer.send(JSON.stringify({ type: 'hello' }))
  },

  async message(peer, raw) {
    const state = peers.get(peer.id)
    if (!state) return
    const parsed = ClientMessage.safeParse((() => {
      try {
        return JSON.parse(raw.text())
      } catch {
        return null
      }
    })())
    if (!parsed.success) {
      peer.send(JSON.stringify({ type: 'error', message: 'Mensagem inválida.' }))
      return
    }

    const message = parsed.data
    if (message.type === 'ping') {
      peer.send(JSON.stringify({ type: 'pong' }))
      return
    }
    if (message.type === 'subscribe') {
      state.slugs = new Set(message.slugs)
      state.logs = message.logs ?? false
      return
    }

    // Ações com resposta (ack) para o painel atualizar o botão na hora.
    try {
      const actions = {
        'instance.start': () => childProcessManager.start(message.slug),
        'instance.stop': () => childProcessManager.stop(message.slug),
        'instance.restart': () => childProcessManager.restart(message.slug),
        'repository.sync': () => repositorySyncService.sync(message.slug)
      }
      const result = await actions[message.action]()
      peer.send(JSON.stringify({ type: 'ack', requestId: message.requestId, ok: true, result }))
    } catch (error) {
      const err = error as { message?: string; why?: string; fix?: string }
      spawnerLog.warn({ event: 'realtime.action_failed', action: message.action, slug: message.slug, error: err.message })
      peer.send(JSON.stringify({ type: 'ack', requestId: message.requestId, ok: false, message: err.message, why: err.why, fix: err.fix }))
    }
  },

  close(peer) {
    peers.get(peer.id)?.unsubscribe()
    peers.delete(peer.id)
  }
})
