import type { RuntimeEvent } from '~/types'
import { commandIcon, OUTCOME_META, type Outcome } from './command-icons'

type Tone = 'success' | 'error' | 'warning' | 'neutral' | 'info' | 'primary'

export type MessageTrace = {
  traceId: string
  chat?: { name?: string; type?: 'group' | 'private' }
  sender?: { name?: string; number?: string }
  command?: { id: string; alias?: string; group?: string }
  messageType?: string
}

export type ActivityItem = {
  id: string
  kind: 'message' | 'system'
  at: string
  startedAt: string
  icon: string
  tone: Tone
  /** Ação de mensagem */
  who?: string
  where?: string
  isGroup?: boolean
  commandName?: string
  alias?: string
  outcome?: Outcome
  /** Evento de sistema */
  title?: string
  subtitle?: string
  durationMs?: number
  count: number
  errorMessage?: string
  events: RuntimeEvent[]
}

const SYSTEM_EVENTS: Record<string, { title: string; icon: string; tone: Tone }> = {
  'runtime.started': { title: 'Bot iniciado', icon: 'i-nucleo-media-play', tone: 'info' },
  'runtime.stopped': { title: 'Bot parado', icon: 'i-nucleo-media-stop', tone: 'neutral' },
  'runtime.config.loaded': { title: 'Configuração carregada', icon: 'i-nucleo-gear', tone: 'neutral' },
  'runtime.config.invalid': { title: 'Configuração inválida', icon: 'i-nucleo-triangle-warning', tone: 'error' },
  'whatsapp.qr.generated': { title: 'QR gerado', icon: 'i-nucleo-qrcode', tone: 'warning' },
  'whatsapp.pairing_code.generated': { title: 'Código de pareamento gerado', icon: 'i-nucleo-phone', tone: 'warning' },
  'whatsapp.authenticated': { title: 'Login aceito', icon: 'i-nucleo-shield-check', tone: 'info' },
  'whatsapp.ready': { title: 'WhatsApp conectado', icon: 'i-nucleo-wifi', tone: 'success' },
  'whatsapp.disconnected': { title: 'WhatsApp desconectado', icon: 'i-nucleo-link-broken', tone: 'warning' },
  'whatsapp.auth_failure': { title: 'Falha no login', icon: 'i-nucleo-skull', tone: 'error' }
}

// Eventos que pertencem a uma ação de comando; sem rastro (bots antigos) são agrupados por sequência.
const COMMAND_FLOW = /^(command|sticker)\./

export function eventTrace(event: RuntimeEvent): MessageTrace | undefined {
  const trace = event.payload?.trace as MessageTrace | undefined
  return trace?.traceId ? trace : undefined
}

function outcomeOf(names: Set<string>, commandId?: string): Outcome {
  if (names.has('command.failed') || names.has('command.error')) return 'error'
  if (names.has('command.permission_denied')) return 'denied'
  if (names.has('command.disabled')) return 'disabled'
  if (names.has('command.executed')) return 'ok'
  if (commandId) return 'running'
  return 'ignored'
}

function summarizeAction(id: string, events: RuntimeEvent[], commandNames: Map<string, string>): ActivityItem {
  const trace = events.map(eventTrace).find(Boolean)
  const names = new Set(events.map((event) => event.eventName))
  const matched = events.find((event) => event.eventName === 'command.matched')
  const command = events.map((event) => eventTrace(event)?.command).find(Boolean)
  const commandId = command?.id ?? (matched?.payload?.commandId as string | undefined) ?? (events.find((event) => event.payload?.commandId)?.payload?.commandId as string | undefined)
  const alias = command?.alias ?? (matched?.payload?.alias as string | undefined)
  const executed = events.find((event) => event.eventName === 'command.executed')
  const failure = events.find((event) => event.eventName === 'command.failed' || event.eventName === 'command.error')
  const outcome = outcomeOf(names, commandId)
  const isGroup = trace?.chat?.type === 'group'

  return {
    id,
    kind: 'message',
    at: events.at(-1)!.createdAt,
    startedAt: events[0]!.createdAt,
    icon: commandIcon(commandId, command?.group),
    tone: OUTCOME_META[outcome].tone,
    who: trace?.sender?.name || trace?.sender?.number || (trace ? 'Alguém' : undefined),
    where: trace ? (isGroup ? trace.chat?.name || 'grupo' : 'privado') : undefined,
    isGroup,
    commandName: commandId ? (commandNames.get(commandId) ?? commandId) : undefined,
    alias,
    outcome,
    durationMs: typeof executed?.payload?.durationMs === 'number' ? executed.payload.durationMs : undefined,
    count: 1,
    errorMessage: failure ? (failure.message ?? (failure.error?.message as string | undefined) ?? 'Erro sem mensagem') : undefined,
    events
  }
}

function summarizeSystem(event: RuntimeEvent): ActivityItem {
  const known = SYSTEM_EVENTS[event.eventName]
  const reason = typeof event.payload?.reason === 'string' ? event.payload.reason : undefined
  const fallbackTone: Tone = event.level === 'error' || event.level === 'fatal' ? 'error' : event.level === 'warn' ? 'warning' : 'neutral'
  return {
    id: String(event.id),
    kind: 'system',
    at: event.createdAt,
    startedAt: event.createdAt,
    title: known?.title ?? event.eventName,
    subtitle: reason ? `motivo: ${reason}` : (event.message ?? undefined),
    icon: known?.icon ?? 'i-nucleo-bolt',
    tone: known?.tone ?? fallbackTone,
    count: 1,
    errorMessage: event.error?.message as string | undefined,
    events: [event]
  }
}

/**
 * Agrupa eventos crus em ações legíveis. Uma mensagem (mesmo traceId) vira uma linha que evolui de
 * "rodando" para "ok"/"erro". Eventos de bots antigos, sem rastro, são agrupados do command.matched
 * até o command.executed/failed. Eventos de sistema iguais e seguidos viram uma linha com contador.
 * Recebe e devolve do mais novo para o mais antigo.
 */
export function buildActivity(events: RuntimeEvent[], options: { commandNames?: Map<string, string>; hideIgnored?: boolean } = {}): ActivityItem[] {
  const commandNames = options.commandNames ?? new Map()
  const chronological = [...events].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id - b.id)
  const groups = new Map<string, RuntimeEvent[]>()
  const order: Array<{ groupId?: string; event?: RuntimeEvent }> = []
  let legacyGroup: string | undefined

  for (const event of chronological) {
    const trace = eventTrace(event)
    let groupId = trace?.traceId
    if (!groupId && COMMAND_FLOW.test(event.eventName)) {
      if (event.eventName === 'command.matched' || !legacyGroup) legacyGroup = `legacy-${event.id}`
      groupId = legacyGroup
      if (/^command\.(executed|failed|disabled|permission_denied)$/.test(event.eventName)) legacyGroup = undefined
    }
    if (!groupId && (event.eventName === 'message.received' || event.eventName === 'message.ignored')) {
      continue // sem rastro, não dá para dizer de quem é: só aparece no modo debug
    }

    if (groupId) {
      if (!groups.has(groupId)) {
        groups.set(groupId, [])
        order.push({ groupId })
      }
      groups.get(groupId)!.push(event)
    } else {
      order.push({ event })
    }
  }

  const items: ActivityItem[] = []
  for (const entry of order) {
    const item = entry.groupId ? summarizeAction(entry.groupId, groups.get(entry.groupId)!, commandNames) : summarizeSystem(entry.event!)
    if (options.hideIgnored && item.outcome === 'ignored') continue

    const previous = items.at(-1)
    if (previous?.kind === 'system' && item.kind === 'system' && previous.title === item.title && previous.subtitle === item.subtitle) {
      previous.count += 1
      previous.at = item.at
      previous.events.push(...item.events)
      continue
    }
    items.push(item)
  }
  return items.reverse()
}

export function stepOffset(event: RuntimeEvent, startedAt: string): string {
  const ms = new Date(event.createdAt).getTime() - new Date(startedAt).getTime()
  return ms <= 0 ? '0 ms' : formatMs(ms)
}

export function formatMs(ms?: number): string {
  if (ms === undefined) return ''
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`
}
