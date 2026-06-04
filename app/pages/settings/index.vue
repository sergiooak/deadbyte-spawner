<template>
  <div class="max-w-3xl space-y-4">
    <h1 class="text-xl font-semibold">Settings</h1>
    <UCard>
      <dl class="grid gap-3 text-sm sm:grid-cols-2">
        <div><dt class="text-gray-500">Database</dt><dd>PostgreSQL via DATABASE_URL</dd></div>
        <div><dt class="text-gray-500">Runtime</dt><dd>Managed bot processes via execa</dd></div>
        <div><dt class="text-gray-500">Manifest</dt><dd>Loaded from bot CLI</dd></div>
        <div><dt class="text-gray-500">Sessions</dt><dd>LocalAuth data path per instance</dd></div>
      </dl>
    </UCard>
  </div>
</template>
