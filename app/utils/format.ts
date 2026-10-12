import type { InstanceStatus } from '~/types'

type BadgeColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'

export const STATUS_META: Record<InstanceStatus, { label: string; color: BadgeColor; icon: string; live?: boolean }> = {
  created: { label: 'Criada', color: 'neutral', icon: 'i-nucleo-sparkle' },
  installing: { label: 'Instalando', color: 'info', icon: 'i-nucleo-box-2', live: true },
  stopped: { label: 'Parada', color: 'neutral', icon: 'i-nucleo-media-stop' },
  starting: { label: 'Iniciando', color: 'info', icon: 'i-nucleo-loader', live: true },
  waiting_qr: { label: 'Aguardando QR', color: 'warning', icon: 'i-nucleo-qrcode', live: true },
  authenticated: { label: 'Autenticada', color: 'info', icon: 'i-nucleo-shield-check', live: true },
  ready: { label: 'Online', color: 'success', icon: 'i-nucleo-wifi', live: true },
  disconnected: { label: 'Desconectada', color: 'warning', icon: 'i-nucleo-link-broken' },
  stopping: { label: 'Parando', color: 'neutral', icon: 'i-nucleo-loader', live: true },
  crashed: { label: 'Caiu', color: 'error', icon: 'i-nucleo-skull' },
  error: { label: 'Erro', color: 'error', icon: 'i-nucleo-triangle-warning' }
}

export function statusMeta(status: string | null | undefined) {
  return STATUS_META[(status ?? 'created') as InstanceStatus] ?? { label: status ?? '—', color: 'neutral' as const, icon: 'i-nucleo-circle-dots' }
}

/** Status em que existe (ou deveria existir) um processo do bot rodando. */
export function isRunningStatus(status: string | null | undefined) {
  return ['installing', 'starting', 'waiting_qr', 'authenticated', 'ready', 'disconnected', 'stopping'].includes(status ?? '')
}

const relative = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })

export function timeAgo(value: string | Date | null | undefined): string {
  if (!value) {
    return '—'
  }
  const diff = (new Date(value).getTime() - Date.now()) / 1000
  const abs = Math.abs(diff)
  if (abs < 45) return 'agora'
  if (abs < 3600) return relative.format(Math.round(diff / 60), 'minute')
  if (abs < 86400) return relative.format(Math.round(diff / 3600), 'hour')
  return relative.format(Math.round(diff / 86400), 'day')
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) {
    return '—'
  }
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' })
}

export function formatTime(value: string | Date | null | undefined): string {
  if (!value) {
    return ''
  }
  return new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function formatDuration(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d) return `${d}d ${h}h`
  if (h) return `${h}h ${m}min`
  return `${m}min`
}

export function shortHash(hash: string | null | undefined): string {
  return hash ? hash.slice(0, 7) : '—'
}

export function toSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Converte `https://github.com/dono/repo.git` em `dono/repo`. */
export function repoLabel(url: string): string {
  const match = /github\.com[/:]([^/]+\/[^/.]+)/.exec(url)
  return match?.[1] ?? url.replace(/^https?:\/\//, '').replace(/\.git$/, '')
}
