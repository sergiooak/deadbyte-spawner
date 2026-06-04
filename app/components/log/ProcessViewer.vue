<template>
  <InstanceLogs :logs="logs" />
</template>

<script setup lang="ts">
defineProps<{ logs?: Array<{ id: number; stream: string; line: string }> }>()
</script>
