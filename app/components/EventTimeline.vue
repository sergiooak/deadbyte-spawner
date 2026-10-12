<template>
  <div>
    <UEmpty v-if="!events.length" icon="i-nucleo-heartbeat" title="Sem eventos" description="Eventos do WhatsApp e dos comandos aparecem aqui." variant="naked" />
    <ol v-else class="relative space-y-1 border-s border-default ps-5">
      <li v-for="event in events" :key="event.id" class="relative">
        <span class="absolute -start-[1.6rem] top-3 grid size-3 place-items-center ring-4 ring-default" :class="dotClass(event.level)" />
        <UCollapsible :disabled="!hasDetails(event)" :ui="{ content: 'pb-2' }">
          <button
            type="button"
            class="flex w-full items-start gap-3 px-2 py-2 text-start hover:bg-elevated/60 disabled:cursor-default"
            :disabled="!hasDetails(event)"
          >
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-mono text-sm text-highlighted">{{ event.eventName }}</span>
                <UBadge :color="levelColor(event.level)" variant="soft" size="sm">{{ event.level }}</UBadge>
              </div>
              <p v-if="event.message" class="mt-0.5 truncate text-sm text-muted">{{ event.message }}</p>
            </div>
            <time class="shrink-0 text-xs text-dimmed tabular-nums" :title="formatDateTime(event.createdAt)">{{ timeAgo(event.createdAt) }}</time>
          </button>
          <template #content>
            <pre class="log-scroll mx-2 max-h-72 overflow-auto bg-elevated p-3 font-mono text-xs text-default">{{ JSON.stringify({ payload: event.payload, error: event.error }, null, 2) }}</pre>
          </template>
        </UCollapsible>
      </li>
    </ol>
  </div>
</template>

<script setup lang="ts">
import type { RuntimeEvent } from '~/types'

defineProps<{ events: RuntimeEvent[] }>()

function hasDetails(event: RuntimeEvent) {
  return Boolean((event.payload && Object.keys(event.payload).length) || event.error)
}

function levelColor(level: RuntimeEvent['level']) {
  if (level === 'error' || level === 'fatal') return 'error' as const
  if (level === 'warn') return 'warning' as const
  if (level === 'debug') return 'neutral' as const
  return 'info' as const
}

function dotClass(level: RuntimeEvent['level']) {
  if (level === 'error' || level === 'fatal') return 'bg-error'
  if (level === 'warn') return 'bg-warning'
  if (level === 'debug') return 'bg-accented'
  return 'bg-info'
}
</script>
