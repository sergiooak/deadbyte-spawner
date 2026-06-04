<template>
  <aside class="border-r border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-900">
    <NuxtLink to="/" class="mb-6 flex items-center gap-2 text-base font-semibold">
      <span class="grid size-8 place-items-center rounded bg-primary text-white">D</span>
      <span>DeadByte</span>
    </NuxtLink>
    <nav class="space-y-1">
      <UButton v-for="item in items" :key="item.to" :to="item.to" :icon="item.icon" color="neutral" variant="ghost" block class="justify-start">
        {{ item.label }}
      </UButton>
    </nav>
  </aside>
</template>

<script setup lang="ts">
const items = [
  { label: 'Dashboard', to: '/', icon: 'i-lucide-layout-dashboard' },
  { label: 'Repositories', to: '/repositories', icon: 'i-lucide-git-branch' },
  { label: 'Instances', to: '/instances', icon: 'i-lucide-bot' },
  { label: 'Logs', to: '/logs', icon: 'i-lucide-scroll-text' },
  { label: 'Settings', to: '/settings', icon: 'i-lucide-settings' }
]
</script>
