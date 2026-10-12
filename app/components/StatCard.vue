<template>
  <UPageCard
    :to="to"
    variant="outline"
    :ui="{ container: 'gap-y-2', wrapper: 'items-start', leading: 'p-2 bg-primary/10 ring ring-inset ring-primary/40 text-primary flex-col', title: 'font-mono font-normal text-muted text-[11px] uppercase tracking-[0.2em]' }"
    :icon="icon"
    :title="label"
    class="bg-black hover:z-1 hover:ring-primary/60"
  >
    <div class="flex items-baseline gap-2">
      <span class="font-pixel text-3xl tabular-nums" :class="highlight ? 'neon-text' : 'text-highlighted'">{{ value }}</span>
      <span v-if="hint" class="font-mono text-xs text-muted">{{ hint }}</span>
    </div>
  </UPageCard>
</template>

<script setup lang="ts">
defineProps<{ label: string; value: string | number; icon: string; hint?: string; to?: string; highlight?: boolean }>()
</script>
