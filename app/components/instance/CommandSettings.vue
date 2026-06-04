<template>
  <div class="space-y-3">
    <div v-for="command in commands" :key="command.commandId" class="rounded border border-gray-200 p-3 dark:border-gray-800">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="font-medium">{{ command.name }}</p>
          <p class="text-xs text-gray-500">{{ command.commandKey }}</p>
        </div>
        <div class="flex items-center gap-3">
          <USwitch v-model="command.enabled" />
          <UBadge color="neutral" variant="soft">{{ command.group }}</UBadge>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  commands?: Array<{
    commandId: string
    commandKey: string
    name: string
    group: string
    enabled: boolean
  }>
}>()
</script>
