<template>
  <div class="rounded border border-gray-200 bg-gray-950 p-3 font-mono text-xs text-gray-100 dark:border-gray-800">
    <div v-for="line in logs" :key="line.id" class="whitespace-pre-wrap">
      <span class="text-gray-500">{{ line.stream }}</span>
      {{ line.line }}
    </div>
    <p v-if="!logs?.length" class="text-gray-400">Sem logs.</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{ logs?: Array<{ id: number; stream: string; line: string }> }>()
</script>
