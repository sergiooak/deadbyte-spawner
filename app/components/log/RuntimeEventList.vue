<template>
  <div class="space-y-2">
    <div v-for="event in events" :key="event.id" class="rounded border border-gray-200 p-3 text-sm dark:border-gray-800">
      <div class="flex items-center justify-between gap-3">
        <span class="font-medium">{{ event.eventName }}</span>
        <UBadge color="neutral" variant="soft">{{ event.level }}</UBadge>
      </div>
      <p v-if="event.message" class="mt-1 text-gray-500">{{ event.message }}</p>
    </div>
    <p v-if="!events?.length" class="text-sm text-gray-500">Sem eventos.</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{ events?: Array<{ id: number; eventName: string; level: string; message?: string | null }> }>()
</script>
