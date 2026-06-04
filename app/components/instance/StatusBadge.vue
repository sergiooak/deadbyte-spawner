<template>
  <UBadge :color="color" variant="soft">{{ status }}</UBadge>
</template>

<script setup lang="ts">
const props = defineProps<{ status?: string | null }>()

const color = computed(() => {
  if (props.status === 'ready') return 'success'
  if (props.status === 'waiting_qr' || props.status === 'starting') return 'warning'
  if (props.status === 'error' || props.status === 'crashed') return 'error'
  return 'neutral'
})
</script>
