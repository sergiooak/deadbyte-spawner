<template>
  <div>
    <UEmpty v-if="!items.length && mode !== 'debug'" icon="i-nucleo-heartbeat" title="Sem atividade" description="Comandos, figurinhas e eventos do WhatsApp aparecem aqui." variant="naked" />

    <!-- SIMPLES: uma linha por ação; o passo a passo aparece ao passar o mouse -->
    <ul v-if="mode === 'simple'" class="divide-y divide-default">
      <li v-for="item in items" :key="item.id">
        <UPopover mode="hover" :open-delay="250" :close-delay="80" :content="{ side: 'top', align: 'start' }">
          <div class="flex items-center gap-3 px-1 py-2 transition hover:bg-elevated/50">
            <span class="relative grid size-8 shrink-0 place-items-center ring ring-inset" :class="toneBox[item.tone]">
              <UIcon :name="item.icon" class="size-4" />
              <span v-if="item.outcome && item.outcome !== 'ok' && item.outcome !== 'ignored'" class="absolute -end-1.5 -bottom-1.5 grid size-4 place-items-center bg-black">
                <UIcon :name="OUTCOME_META[item.outcome].icon" class="size-3" :class="[toneText[OUTCOME_META[item.outcome].tone], item.outcome === 'running' ? 'animate-spin' : '']" />
              </span>
            </span>

            <p v-if="item.kind === 'message'" class="min-w-0 flex-1 truncate text-sm">
              <span class="font-semibold text-highlighted">{{ item.who ?? 'Alguém' }}</span>
              <span class="text-dimmed"> {{ item.isGroup ? 'em' : '·' }} </span>
              <span :class="item.isGroup ? 'text-toned' : 'text-dimmed'">{{ item.where ?? '—' }}</span>
              <span class="text-dimmed"> → </span>
              <span class="text-highlighted">{{ item.commandName ?? 'mensagem' }}</span>
              <span v-if="item.alias" class="ms-1.5 font-mono text-xs text-primary">!{{ item.alias }}</span>
              <span v-if="item.errorMessage" class="ms-2 text-xs text-error">· {{ item.errorMessage }}</span>
            </p>
            <p v-else class="min-w-0 flex-1 truncate text-sm">
              <span class="text-toned">{{ item.title }}</span>
              <UBadge v-if="item.count > 1" color="neutral" variant="soft" size="sm" class="ms-2">×{{ item.count }}</UBadge>
              <span v-if="item.subtitle" class="ms-2 text-xs text-dimmed">{{ item.subtitle }}</span>
            </p>

            <span class="flex shrink-0 items-center gap-3 font-mono text-[11px] text-dimmed">
              <span v-if="item.durationMs !== undefined" class="text-muted">{{ formatMs(item.durationMs) }}</span>
              <time :title="formatDateTime(item.at)">{{ timeAgo(item.at) }}</time>
            </span>
          </div>

          <template #content>
            <div class="w-80 max-w-[90vw] space-y-2 p-3">
              <p class="font-mono text-[10px] tracking-[0.2em] text-muted uppercase">{{ formatDateTime(item.startedAt) }}</p>
              <ol class="space-y-1">
                <li v-for="event in item.events" :key="event.id" class="flex items-center gap-2 font-mono text-[11px]">
                  <span class="w-14 shrink-0 text-end text-dimmed tabular-nums">+{{ stepOffset(event, item.startedAt) }}</span>
                  <span class="size-1.5 shrink-0" :class="dotClass(event)" />
                  <span :class="levelText(event)">{{ STEP_LABELS[event.eventName] ?? event.eventName }}</span>
                </li>
              </ol>
              <p v-if="item.errorMessage" class="border-t border-default pt-2 text-xs text-error">{{ item.errorMessage }}</p>
            </div>
          </template>
        </UPopover>
      </li>
    </ul>

    <!-- DETALHADO: expande cada ação com os dados de cada passo -->
    <ul v-else-if="mode === 'detailed'" class="divide-y divide-default">
      <li v-for="item in items" :key="item.id">
        <UCollapsible :ui="{ content: 'pb-3' }">
          <button type="button" class="flex w-full items-center gap-3 px-1 py-2.5 text-start transition hover:bg-elevated/50">
            <span class="grid size-9 shrink-0 place-items-center ring ring-inset" :class="toneBox[item.tone]">
              <UIcon :name="item.icon" class="size-5" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="flex items-center gap-2">
                <span class="truncate font-medium text-highlighted">{{ item.kind === 'message' ? (item.commandName ?? 'Mensagem sem comando') : item.title }}</span>
                <UBadge v-if="item.count > 1" color="neutral" variant="soft" size="sm">×{{ item.count }}</UBadge>
                <UBadge v-if="item.outcome" :color="OUTCOME_META[item.outcome].tone" variant="subtle" size="sm" :icon="OUTCOME_META[item.outcome].icon">{{ OUTCOME_META[item.outcome].label }}</UBadge>
              </span>
              <span class="block truncate text-xs" :class="item.errorMessage ? 'text-error' : 'text-muted'">
                {{ item.errorMessage ?? (item.kind === 'message' ? `${item.who ?? 'Alguém'} · ${item.where ?? '—'}${item.alias ? ` · !${item.alias}` : ''}` : item.subtitle) }}
              </span>
            </span>
            <span class="flex shrink-0 flex-col items-end gap-0.5 font-mono text-[11px] text-dimmed">
              <time :title="formatDateTime(item.at)">{{ timeAgo(item.at) }}</time>
              <span v-if="item.durationMs !== undefined" class="text-muted">{{ formatMs(item.durationMs) }}</span>
            </span>
          </button>

          <template #content>
            <div class="ms-12 space-y-1 border-s border-default ps-4">
              <div v-for="event in item.events" :key="event.id" class="flex items-center gap-3 font-mono text-[11px]">
                <span class="w-16 shrink-0 text-dimmed tabular-nums">+{{ stepOffset(event, item.startedAt) }}</span>
                <span :class="levelText(event)">{{ STEP_LABELS[event.eventName] ?? event.eventName }}</span>
                <span v-if="detail(event)" class="truncate text-dimmed">{{ detail(event) }}</span>
              </div>
            </div>
          </template>
        </UCollapsible>
      </li>
    </ul>

    <!-- DEBUG: eventos crus, um por linha, com payload -->
    <div v-else class="log-scroll max-h-[70vh] overflow-auto font-mono text-[11px]">
      <div v-for="event in rawEvents" :key="event.id" class="grid grid-cols-[5.5rem_3.5rem_minmax(10rem,auto)_1fr] gap-3 border-b border-default/50 px-1 py-1 hover:bg-elevated/40">
        <span class="text-dimmed tabular-nums">{{ formatTime(event.createdAt) }}</span>
        <span :class="levelText(event)">{{ event.level }}</span>
        <span class="text-highlighted">{{ event.eventName }}</span>
        <span class="break-all text-dimmed">{{ debugPayload(event) }}</span>
      </div>
      <p v-if="!rawEvents.length" class="p-6 text-center text-muted">Sem eventos.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { RuntimeEvent } from '~/types'

export type ActivityMode = 'simple' | 'detailed' | 'debug'

const props = withDefaults(
  defineProps<{ events: RuntimeEvent[]; commandNames?: Map<string, string>; hideIgnored?: boolean; limit?: number; mode?: ActivityMode }>(),
  { commandNames: () => new Map(), hideIgnored: true, limit: undefined, mode: 'simple' }
)

const items = computed(() => {
  const all = buildActivity(props.events, { commandNames: props.commandNames, hideIgnored: props.hideIgnored })
  return props.limit ? all.slice(0, props.limit) : all
})
const rawEvents = computed(() => [...props.events].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id))

const toneBox: Record<string, string> = {
  primary: 'bg-primary/10 text-primary ring-primary/40',
  success: 'bg-primary/10 text-primary ring-primary/40',
  error: 'bg-error/15 text-error ring-error/50',
  warning: 'bg-warning/10 text-warning ring-warning/40',
  info: 'bg-info/10 text-info ring-info/40',
  neutral: 'bg-elevated text-muted ring-default'
}
const toneText: Record<string, string> = {
  success: 'text-primary',
  error: 'text-error',
  warning: 'text-warning',
  info: 'text-info',
  neutral: 'text-muted',
  primary: 'text-primary'
}

function levelText(event: RuntimeEvent) {
  if (event.level === 'error' || event.level === 'fatal') return 'text-error'
  if (event.level === 'warn') return 'text-warning'
  if (event.level === 'debug') return 'text-dimmed'
  return 'text-toned'
}

function dotClass(event: RuntimeEvent) {
  if (event.level === 'error' || event.level === 'fatal') return 'bg-error'
  if (event.level === 'warn') return 'bg-warning'
  if (event.eventName === 'command.executed') return 'bg-primary'
  return 'bg-neutral-500'
}

function detail(event: RuntimeEvent): string {
  if (event.error?.message) return String(event.error.message)
  const { trace: _trace, qr: _qr, ...payload } = (event.payload ?? {}) as Record<string, unknown>
  return Object.entries(payload)
    .filter(([, value]) => value !== undefined && value !== null && typeof value !== 'object')
    .map(([key, value]) => `${key}=${String(value).slice(0, 60)}`)
    .join(' ')
}

function debugPayload(event: RuntimeEvent): string {
  const { qr, ...payload } = (event.payload ?? {}) as Record<string, unknown>
  const data = { ...payload, ...(qr ? { qr: '[oculto]' } : {}), ...(event.error ? { error: event.error } : {}), ...(event.message ? { message: event.message } : {}) }
  return Object.keys(data).length ? JSON.stringify(data) : ''
}
</script>
