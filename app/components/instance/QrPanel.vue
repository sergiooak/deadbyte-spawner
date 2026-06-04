<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-base font-semibold">QR</h2>
        <UButton icon="i-lucide-refresh-cw" color="neutral" variant="ghost" size="sm" @click="refresh" />
      </div>
    </template>
    <div v-if="data?.svg" class="grid place-items-center" v-html="data.svg" />
    <p v-else class="text-sm text-gray-500">Nenhum QR capturado ainda.</p>
  </UCard>
</template>

<script setup lang="ts">
const props = defineProps<{ slug: string }>()
const { data, refresh } = await useFetch<{ qr: string | null; svg: string | null }>(() => `/api/instances/${props.slug}/qr`)
</script>
