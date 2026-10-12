<template>
  <UBadge :color="meta.color" variant="subtle" :size="size" class="gap-1.5 font-medium">
    <span class="relative flex size-2">
      <span v-if="meta.live" class="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60" />
      <span class="relative inline-flex size-2 rounded-full bg-current" />
    </span>
    {{ meta.label }}
  </UBadge>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{ status?: string | null; size?: 'sm' | 'md' | 'lg' }>(), { size: 'md' })
const meta = computed(() => statusMeta(props.status))
</script>
