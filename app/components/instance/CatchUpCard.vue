<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <h3 class="font-pixel text-lg text-highlighted">Mensagens pendentes</h3>
        <UBadge v-if="state?.running" color="info" variant="subtle" icon="i-nucleo-loader" :ui="{ leadingIcon: 'animate-spin' }">reprocessando</UBadge>
        <UBadge v-else-if="state && !state.enabled" color="neutral" variant="subtle">automático desligado</UBadge>
      </div>
    </template>

    <p v-if="status !== 'ready'" class="text-sm text-muted">Conecte o WhatsApp para ver e reprocessar mensagens pendentes.</p>

    <div v-else class="space-y-4">
      <dl class="grid gap-4 sm:grid-cols-2">
        <div class="min-w-0">
          <dt class="text-xs text-muted">Última mensagem processada</dt>
          <dd v-if="state?.checkpoint" class="mt-1 text-sm text-highlighted">
            {{ formatDateTime(new Date(state.checkpoint.lastMessageAt * 1000)) }}
            <span class="block truncate text-xs text-muted" :title="state.checkpoint.chatName">{{ state.checkpoint.chatName ?? '—' }}</span>
          </dd>
          <dd v-else class="mt-1 text-sm text-muted">Nenhuma ainda. Ao ligar, o bot responde os chats marcados como não lidos.</dd>
        </div>
        <div class="min-w-0">
          <dt class="text-xs text-muted">Último reprocessamento</dt>
          <dd v-if="state?.last" class="mt-1 text-sm text-highlighted">
            {{ MODE_LABELS[state.last.mode] }} · {{ state.last.finishedAt ? timeAgo(state.last.finishedAt) : 'em andamento' }}
            <span class="block text-xs" :class="state.last.error ? 'text-error' : 'text-muted'">
              {{ state.last.error ?? `${state.last.messages} mensagens em ${state.last.chats} chats${state.last.skipped ? ` · ${state.last.skipped} puladas pelo limite` : ''}` }}
            </span>
          </dd>
          <dd v-else class="mt-1 text-sm text-muted">Nenhum desde que o bot ligou.</dd>
        </div>
      </dl>

      <div class="flex flex-wrap gap-2">
        <UButton icon="i-nucleo-history" :loading="starting === 'today'" :disabled="state?.running || Boolean(starting)" @click="start('today')">Responder pendentes de hoje</UButton>
        <UButton color="neutral" variant="outline" icon="i-nucleo-chat-bubble" :loading="starting === 'unread'" :disabled="state?.running || Boolean(starting)" @click="start('unread')">Responder não lidos</UButton>
      </div>

      <p v-if="state" class="font-mono text-[11px] text-dimmed">
        Só chats em que o bot ainda não respondeu · até {{ state.limits.perChat }} por chat e {{ state.limits.total }} por rodada · pausa de
        {{ state.limits.minDelayMs / 1000 }}–{{ state.limits.maxDelayMs / 1000 }} s · nada com mais de {{ state.limits.maxAgeHours }} h
      </p>
    </div>
  </UCard>
</template>

<script setup lang="ts">
type Mode = 'checkpoint' | 'unread' | 'today'
type CatchUpState = {
  running: boolean
  enabled: boolean
  checkpoint: { lastMessageAt: number; lastMessageId?: string; chatName?: string; updatedAt: string } | null
  last: { mode: Mode; since: string; startedAt: string; finishedAt?: string; chats: number; messages: number; skipped: number; error?: string } | null
  limits: { maxAgeHours: number; perChat: number; total: number; minDelayMs: number; maxDelayMs: number }
}

const MODE_LABELS: Record<Mode, string> = { checkpoint: 'Desde a última mensagem', unread: 'Não lidos', today: 'Pendentes de hoje' }

const props = defineProps<{ slug: string; status: string }>()
const base = computed(() => `/api/instances/${props.slug}/bot`)
const state = ref<CatchUpState>()
const starting = ref<Mode | ''>('')

async function load() {
  if (props.status !== 'ready') return
  state.value = await apiRequest<CatchUpState>(`${base.value}/catch-up`).catch(() => state.value)
}

async function start(mode: Mode) {
  starting.value = mode
  const result = await withToast(() => apiRequest(`${base.value}/catch-up`, { method: 'POST', body: { mode } }), {
    success: 'Reprocessamento iniciado',
    error: 'Não foi possível iniciar'
  })
  starting.value = ''
  if (result) await load()
}

watch(() => props.status, load, { immediate: true })
// Enquanto reprocessa, acompanha o progresso; parado, só atualiza de vez em quando.
usePolling(load, 4000, () => props.status === 'ready' && Boolean(state.value?.running))
usePolling(load, 30_000, () => props.status === 'ready' && !state.value?.running)
</script>
