<template>
  <UCard :ui="{ body: 'p-5' }">
    <div v-if="status === 'ready'" class="flex flex-col items-center gap-3 py-6 text-center">
      <div class="grid size-14 place-items-center rounded-full bg-success/10 ring ring-inset ring-success/25">
        <UIcon name="i-lucide-smartphone" class="size-7 text-success" />
      </div>
      <div>
        <p class="font-semibold text-highlighted">WhatsApp conectado</p>
        <p class="text-sm text-muted">Online {{ timeAgo(lastReadyAt) }}</p>
      </div>
    </div>

    <div v-else-if="data?.svg" class="flex flex-col items-center gap-4">
      <div class="rounded-xl bg-white p-3 shadow-sm ring ring-default [&>svg]:size-56 sm:[&>svg]:size-64" v-html="data.svg" />
      <div class="text-center">
        <p class="font-semibold text-highlighted">Escaneie com o WhatsApp</p>
        <p class="text-sm text-muted">Aparelhos conectados → Conectar um aparelho</p>
      </div>
      <p class="flex items-center gap-1.5 text-xs text-dimmed">
        <UIcon name="i-lucide-refresh-cw" class="size-3 animate-spin [animation-duration:3s]" /> O QR renova sozinho a cada poucos segundos
      </p>
    </div>

    <div v-else-if="isRunningStatus(status)" class="flex flex-col items-center gap-3 py-8 text-center">
      <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-primary" />
      <div>
        <p class="font-semibold text-highlighted">{{ status === 'authenticated' ? 'Carregando conversas…' : 'Abrindo o WhatsApp Web…' }}</p>
        <p class="text-sm text-muted">Isso pode levar até um minuto na primeira vez.</p>
      </div>
    </div>

    <UEmpty
      v-else
      icon="i-lucide-qr-code"
      title="Bot desligado"
      description="Inicie a instância para gerar o QR de pareamento ou reconectar a sessão salva."
      variant="naked"
    />
  </UCard>
</template>

<script setup lang="ts">
const props = defineProps<{ slug: string; status?: string | null; lastReadyAt?: string | null }>()

const { data, refresh } = await useApi<{ qr: string | null; svg: string | null }>(() => `/api/instances/${props.slug}/qr`)

watch(() => props.status, () => refresh())
usePolling(refresh, 3000, () => props.status === 'waiting_qr' || props.status === 'starting')
</script>
