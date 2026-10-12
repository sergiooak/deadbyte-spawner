<template>
  <UModal v-model:open="open" :title="title" :description="description" :ui="{ footer: 'justify-end' }">
    <template v-if="confirmText" #body>
      <div class="space-y-3">
        <p class="text-sm text-muted">
          Digite <span class="font-mono font-semibold text-highlighted">{{ confirmText }}</span> para confirmar.
        </p>
        <UInput v-model="typed" :placeholder="confirmText" class="w-full" autofocus @keydown.enter="submit" />
      </div>
    </template>
    <template #footer>
      <UButton color="neutral" variant="ghost" @click="open = false">Cancelar</UButton>
      <UButton :color="color" :loading="loading" :disabled="!canConfirm" :icon="icon" @click="submit">{{ actionLabel }}</UButton>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    actionLabel?: string
    confirmText?: string
    color?: 'error' | 'warning' | 'primary'
    icon?: string
    action: () => Promise<unknown>
  }>(),
  { actionLabel: 'Confirmar', color: 'error', icon: undefined, description: undefined, confirmText: undefined }
)

const open = defineModel<boolean>('open', { default: false })
const typed = ref('')
const loading = ref(false)
const canConfirm = computed(() => !props.confirmText || typed.value.trim() === props.confirmText)

watch(open, (value) => {
  if (value) typed.value = ''
})

async function submit() {
  if (!canConfirm.value) return
  loading.value = true
  try {
    await props.action()
    open.value = false
  } finally {
    loading.value = false
  }
}
</script>
