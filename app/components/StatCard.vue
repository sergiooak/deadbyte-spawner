<template>
  <UPageCard :to="to" variant="subtle" :ui="{ container: 'gap-y-1.5', wrapper: 'items-start', leading: 'p-2.5 rounded-full bg-primary/10 ring ring-inset ring-primary/25 flex-col', title: 'font-normal text-muted text-xs uppercase tracking-wide' }" :icon="icon" :title="label" class="lg:rounded-none first:rounded-l-lg last:rounded-r-lg hover:z-1">
    <div class="flex items-baseline gap-2">
      <span class="text-2xl font-semibold text-highlighted tabular-nums">{{ value }}</span>
      <span v-if="hint" class="text-xs text-muted">{{ hint }}</span>
    </div>
  </UPageCard>
</template>

<script setup lang="ts">
defineProps<{ label: string; value: string | number; icon: string; hint?: string; to?: string }>()
</script>
