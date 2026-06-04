<template>
  <div class="grid gap-3 sm:grid-cols-4">
    <UCard v-for="item in items" :key="item.label">
      <p class="text-sm text-gray-500">{{ item.label }}</p>
      <p class="mt-1 text-2xl font-semibold">{{ item.value }}</p>
    </UCard>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ commandsCount?: number; versionsCount?: number }>()
const items = computed(() => [
  { label: 'Commands', value: props.commandsCount ?? 0 },
  { label: 'Versions', value: props.versionsCount ?? 0 },
  { label: 'Aliases', value: '-' },
  { label: 'Removed', value: '-' }
])
</script>
