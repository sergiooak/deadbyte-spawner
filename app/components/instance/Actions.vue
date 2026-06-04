<template>
  <div class="flex flex-wrap gap-2">
    <UButton icon="i-lucide-play" color="success" variant="soft" :loading="loading === 'start'" @click="run('start')">Start</UButton>
    <UButton icon="i-lucide-square" color="warning" variant="soft" :loading="loading === 'stop'" @click="run('stop')">Stop</UButton>
    <UButton icon="i-lucide-rotate-cw" color="primary" variant="soft" :loading="loading === 'restart'" @click="run('restart')">Restart</UButton>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ slug: string }>()
const emit = defineEmits<{ refresh: [] }>()
const loading = ref<string>()

async function run(action: 'start' | 'stop' | 'restart') {
  loading.value = action
  try {
    await $fetch(`/api/instances/${props.slug}/${action}`, { method: 'POST' })
    emit('refresh')
  } finally {
    loading.value = undefined
  }
}
</script>
