<template>
  <div class="flex items-center gap-1.5">
    <template v-if="running">
      <UButton
        icon="i-lucide-rotate-cw"
        color="neutral"
        variant="outline"
        :size="size"
        :loading="busy === 'restart'"
        :disabled="!!busy"
        @click="run('restart')"
      >
        <span :class="compact ? 'sr-only' : 'max-sm:sr-only'">Reiniciar</span>
      </UButton>
      <UButton
        icon="i-lucide-square"
        color="error"
        variant="soft"
        :size="size"
        :loading="busy === 'stop'"
        :disabled="!!busy"
        @click="run('stop')"
      >
        <span :class="compact ? 'sr-only' : 'max-sm:sr-only'">Parar</span>
      </UButton>
    </template>
    <UButton
      v-else
      icon="i-lucide-play"
      color="primary"
      :size="size"
      :loading="busy === 'start'"
      :disabled="!!busy"
      @click="run('start')"
    >
      <span :class="compact ? 'sr-only' : 'max-sm:sr-only'">Iniciar</span>
    </UButton>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{ slug: string; status?: string | null; compact?: boolean; size?: 'xs' | 'sm' | 'md' }>(), {
  status: undefined,
  compact: false,
  size: 'sm'
})
const emit = defineEmits<{ changed: [] }>()

const busy = ref<'start' | 'stop' | 'restart'>()
const running = computed(() => isRunningStatus(props.status))

const labels = {
  start: { success: 'Instância iniciando', error: 'Não foi possível iniciar' },
  stop: { success: 'Instância parada', error: 'Não foi possível parar' },
  restart: { success: 'Instância reiniciando', error: 'Não foi possível reiniciar' }
}

async function run(action: 'start' | 'stop' | 'restart') {
  busy.value = action
  await withToast(() => apiRequest(`/api/instances/${props.slug}/${action}`, { method: 'POST' }), labels[action])
  busy.value = undefined
  emit('changed')
}
</script>
