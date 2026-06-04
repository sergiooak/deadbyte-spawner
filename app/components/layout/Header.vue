<template>
  <header class="sticky top-0 z-10 border-b border-gray-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-gray-800 dark:bg-gray-950/90 sm:px-6 lg:px-8">
    <div class="flex items-center justify-between gap-3">
      <div>
        <p class="text-sm text-gray-500">DeadByte v4</p>
        <h1 class="text-lg font-semibold">Spawner</h1>
      </div>
      <div class="flex items-center gap-2">
        <UButton icon="i-lucide-refresh-cw" color="neutral" variant="soft" to="/" aria-label="Refresh" />
        <UButton icon="i-lucide-settings" color="neutral" variant="ghost" to="/settings" aria-label="Settings" />
      </div>
    </div>
  </header>
</template>
