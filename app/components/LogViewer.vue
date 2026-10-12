<template>
  <div class="flex min-h-0 flex-col overflow-hidden bg-black ring ring-neutral-800" :class="heightClass">
    <div class="flex flex-wrap items-center gap-2 border-b border-neutral-800 px-3 py-2">
      <div class="flex items-center gap-1.5">
        <span class="size-2.5 bg-red-500/80" />
        <span class="size-2.5 bg-amber-400/80" />
        <span class="size-2.5 bg-emerald-500/80" />
      </div>
      <UInput
        v-model="filter"
        icon="i-nucleo-magnifier"
        placeholder="Filtrar…"
        size="xs"
        variant="none"
        class="ms-2 w-40 text-neutral-200"
        :ui="{ base: 'text-neutral-200 placeholder:text-neutral-500', leadingIcon: 'text-neutral-500' }"
      />
      <div class="ms-auto flex items-center gap-1">
        <UButton
          v-for="option in streamOptions"
          :key="option.value"
          size="xs"
          :variant="stream === option.value ? 'soft' : 'ghost'"
          color="neutral"
          class="text-neutral-300"
          @click="stream = option.value"
        >
          {{ option.label }}
        </UButton>
        <USeparator orientation="vertical" class="mx-1 h-4" :ui="{ border: 'border-neutral-700' }" />
        <UTooltip :text="eventsVisible ? 'Ocultar eventos estruturados' : 'Mostrar eventos estruturados'">
          <UButton
            size="xs"
            color="neutral"
            :variant="eventsVisible ? 'soft' : 'ghost'"
            class="text-neutral-300"
            icon="i-nucleo-bolt"
            aria-label="Alternar eventos"
            @click="eventsVisible = !eventsVisible"
          />
        </UTooltip>
        <UTooltip :text="autoRefresh ? 'Pausar atualização' : 'Retomar atualização'">
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            class="text-neutral-300"
            :icon="autoRefresh ? 'i-nucleo-media-pause' : 'i-nucleo-media-play'"
            :aria-label="autoRefresh ? 'Pausar' : 'Retomar'"
            @click="autoRefresh = !autoRefresh"
          />
        </UTooltip>
        <UTooltip text="Copiar">
          <UButton size="xs" color="neutral" variant="ghost" class="text-neutral-300" icon="i-nucleo-copy" aria-label="Copiar logs" @click="copy" />
        </UTooltip>
      </div>
    </div>

    <div ref="scroller" class="log-scroll min-h-0 flex-1 overflow-auto px-3 py-2 font-mono text-[12px] leading-5" @scroll="onScroll">
      <p v-if="!visible.length" class="py-6 text-center text-neutral-500">{{ emptyMessage }}</p>
      <div v-for="line in visible" :key="line.id" class="group flex gap-3 rounded px-1 hover:bg-white/5">
        <span class="shrink-0 select-none text-neutral-600 tabular-nums">{{ formatTime(line.createdAt) }}</span>
        <span class="min-w-0 break-all whitespace-pre-wrap" :class="lineClass(line)">{{ display(line.line) }}</span>
      </div>
    </div>

    <div class="flex items-center justify-between border-t border-neutral-800 px-3 py-1.5 text-[11px] text-neutral-500">
      <span>{{ visible.length }} linhas{{ hiddenEvents ? ` · ${hiddenEvents} eventos ocultos` : '' }}</span>
      <span class="flex items-center gap-1.5">
        <span class="size-1.5" :class="autoRefresh ? 'bg-emerald-500' : 'bg-neutral-600'" />
        {{ autoRefresh ? 'ao vivo' : 'pausado' }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProcessLog } from '~/types'

const props = withDefaults(defineProps<{ logs: ProcessLog[]; heightClass?: string; showEvents?: boolean }>(), {
  heightClass: 'h-[32rem]',
  showEvents: false
})
const autoRefresh = defineModel<boolean>('autoRefresh', { default: true })

const EVENT_PREFIX = '__DEADBYTE_EVENT__'
const filter = ref('')
const stream = ref<'all' | 'stdout' | 'stderr'>('all')
const streamOptions = [
  { label: 'Tudo', value: 'all' as const },
  { label: 'stdout', value: 'stdout' as const },
  { label: 'stderr', value: 'stderr' as const }
]
const scroller = ref<HTMLElement>()
const eventsVisible = ref(props.showEvents)
const stickToBottom = ref(true)

// A API devolve do mais novo para o mais antigo; o terminal mostra em ordem cronológica.
const ordered = computed(() => [...props.logs].reverse())
const hiddenEvents = computed(() => (eventsVisible.value ? 0 : ordered.value.filter((line) => line.line.startsWith(EVENT_PREFIX)).length))
const emptyMessage = computed(() => {
  if (!props.logs.length) return 'Sem logs ainda.'
  if (hiddenEvents.value === props.logs.length) return 'Por enquanto só há eventos estruturados. Clique em ⚡ para mostrá-los.'
  return 'Nada corresponde ao filtro.'
})

const visible = computed(() => {
  const term = filter.value.trim().toLowerCase()
  return ordered.value.filter((line) => {
    if (!eventsVisible.value && line.line.startsWith(EVENT_PREFIX)) return false
    if (stream.value !== 'all' && line.stream !== stream.value) return false
    return !term || line.line.toLowerCase().includes(term)
  })
})

function display(line: string) {
  return line.startsWith(EVENT_PREFIX) ? `⚡ ${line.slice(EVENT_PREFIX.length)}` : line
}

function lineClass(line: ProcessLog) {
  if (line.stream === 'stderr') return 'text-red-300'
  if (line.line.startsWith(EVENT_PREFIX)) return 'text-emerald-300'
  if (/\b(warn|warning)\b/i.test(line.line)) return 'text-amber-300'
  if (/\b(error|erro|fail|falh)/i.test(line.line)) return 'text-red-300'
  return 'text-neutral-200'
}

function onScroll() {
  const el = scroller.value
  if (!el) return
  stickToBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight < 40
}

watch(
  () => visible.value.length,
  async () => {
    if (!stickToBottom.value) return
    await nextTick()
    scroller.value?.scrollTo({ top: scroller.value.scrollHeight })
  },
  { immediate: true }
)

async function copy() {
  await navigator.clipboard.writeText(visible.value.map((line) => `${line.createdAt} [${line.stream}] ${line.line}`).join('\n'))
  useToast().add({ title: 'Logs copiados', icon: 'i-nucleo-clipboard-check', color: 'success' })
}
</script>
