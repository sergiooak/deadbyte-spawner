<template>
  <UCard :ui="{ body: 'p-5' }" class="bg-black">
    <div v-if="status === 'ready'" class="flex flex-col items-center gap-3 py-6 text-center">
      <BrandIllustration name="bot-connected" alt="Bot conectado" size-class="max-w-48" />
      <div>
        <p class="font-mono text-sm tracking-wider text-highlighted uppercase">WhatsApp conectado</p>
        <p class="text-sm text-muted">Online {{ timeAgo(lastReadyAt) }}</p>
      </div>
    </div>

    <div v-else-if="status === 'waiting_qr'" class="space-y-5">
      <UTabs
        v-model="method"
        :items="methods"
        :content="false"
        size="sm"
        class="w-full"
        :ui="{ list: 'w-full', trigger: 'flex-1' }"
      />

      <!-- QR -->
      <div v-if="method === 'qr'" class="flex flex-col items-center gap-4">
        <div v-if="data?.svg" class="neon-ring bg-white p-3 [&>svg]:size-56 sm:[&>svg]:size-64" v-html="data.svg" />
        <USkeleton v-else class="size-62 sm:size-70" />
        <ol class="w-full space-y-1 font-mono text-xs text-muted">
          <li><span class="text-primary">01</span> Abra o WhatsApp no celular</li>
          <li><span class="text-primary">02</span> Aparelhos conectados → Conectar um aparelho</li>
          <li><span class="text-primary">03</span> Aponte a câmera para o código</li>
        </ol>
      </div>

      <!-- Número de telefone -->
      <div v-else class="space-y-4">
        <template v-if="pairing?.active && pairing.code">
          <div class="neon-ring bg-primary/5 px-4 py-5 text-center">
            <p class="font-mono text-[11px] tracking-[0.25em] text-muted uppercase">Código de pareamento</p>
            <p class="mt-2 font-pixel text-4xl tracking-widest select-all neon-text">{{ pairing.code }}</p>
            <p class="mt-2 font-mono text-xs text-dimmed">para {{ pairing.phoneNumber }} · renova a cada ~3 min</p>
          </div>
          <ol class="space-y-1 font-mono text-xs text-muted">
            <li><span class="text-primary">01</span> No celular, toque na notificação do WhatsApp</li>
            <li><span class="text-primary">02</span> Ou: Aparelhos conectados → Conectar com número de telefone</li>
            <li><span class="text-primary">03</span> Digite o código acima</li>
          </ol>
          <div class="flex gap-2">
            <UButton color="neutral" variant="outline" icon="i-nucleo-copy" class="flex-1 justify-center" @click="copyCode">Copiar</UButton>
            <UButton color="neutral" variant="ghost" icon="i-nucleo-xmark" :loading="cancelling" @click="cancel">Cancelar</UButton>
          </div>
        </template>

        <UForm v-else :state="form" class="space-y-3" @submit="requestCode">
          <UFormField label="Número do WhatsApp do bot" name="phoneNumber" help="Com DDI e DDD, ex.: 55 34 99999-9999">
            <UInput
              v-model="form.phoneNumber"
              type="tel"
              inputmode="tel"
              autocomplete="off"
              placeholder="55 34 99999-9999"
              icon="i-nucleo-phone"
              class="w-full"
            />
          </UFormField>
          <UButton type="submit" block icon="i-nucleo-password" :loading="requesting" :disabled="digits.length < 10">Gerar código</UButton>
          <p class="font-mono text-[11px] text-dimmed">O número não é salvo: ele só é usado para pedir o código ao WhatsApp.</p>
        </UForm>
      </div>
    </div>

    <div v-else-if="isRunningStatus(status)" class="flex flex-col items-center gap-3 py-8 text-center">
      <UIcon name="i-nucleo-loader" class="size-6 animate-spin text-primary" />
      <div>
        <p class="font-mono text-sm tracking-wider text-highlighted uppercase">
          {{ status === 'authenticated' ? 'Carregando conversas' : 'Abrindo o WhatsApp Web' }}
        </p>
        <p class="text-sm text-muted">Isso pode levar até um minuto na primeira vez.</p>
      </div>
    </div>

    <div v-else class="flex flex-col items-center gap-2">
      <BrandIllustration :name="status === 'crashed' || status === 'error' ? 'bot-crashed' : 'bot-offline'" size-class="max-w-48" />
      <UEmpty
        :title="status === 'crashed' || status === 'error' ? 'O bot caiu' : 'Bot desligado'"
        description="Inicie a instância para conectar por QR code ou pelo número de telefone."
        variant="naked"
        :ui="{ root: 'py-2' }"
      />
    </div>
  </UCard>
</template>

<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui'

type Pairing = { active: false } | { active: true; code: string; phoneNumber: string; updatedAt: string }

const props = defineProps<{ slug: string; status?: string | null; lastReadyAt?: string | null }>()

const method = ref<'qr' | 'phone'>('qr')
const methods: TabsItem[] = [
  { label: 'QR code', icon: 'i-nucleo-qrcode', value: 'qr' },
  { label: 'Número', icon: 'i-nucleo-phone', value: 'phone' }
]

const { data, refresh } = await useApi<{ qr: string | null; svg: string | null }>(() => `/api/instances/${props.slug}/qr`)

const pairing = ref<Pairing | null>(null)
const form = reactive({ phoneNumber: '' })
const digits = computed(() => form.phoneNumber.replace(/\D/g, ''))
const requesting = ref(false)
const cancelling = ref(false)

async function loadPairing() {
  if (props.status !== 'waiting_qr') {
    pairing.value = null
    return
  }
  pairing.value = await apiRequest<Pairing>(`/api/instances/${props.slug}/pairing-code`).catch(() => null)
  if (pairing.value?.active) method.value = 'phone'
}

async function requestCode() {
  requesting.value = true
  const result = await withToast(
    () => apiRequest<Pairing>(`/api/instances/${props.slug}/pairing-code`, { method: 'POST', body: { phoneNumber: form.phoneNumber } }),
    { error: 'Não foi possível gerar o código' }
  )
  requesting.value = false
  if (result) {
    pairing.value = result
    form.phoneNumber = ''
  }
}

async function cancel() {
  cancelling.value = true
  await withToast(() => apiRequest(`/api/instances/${props.slug}/pairing-code`, { method: 'DELETE' }), { error: 'Não foi possível cancelar' })
  cancelling.value = false
  pairing.value = null
  method.value = 'qr'
  await refresh()
}

async function copyCode() {
  if (!pairing.value?.active) return
  await navigator.clipboard.writeText(pairing.value.code.replace('-', ''))
  useToast().add({ title: 'Código copiado', icon: 'i-nucleo-clipboard-check', color: 'success' })
}

watch(() => props.status, () => {
  void refresh()
  void loadPairing()
})
onMounted(loadPairing)

usePolling(refresh, 3000, () => props.status === 'starting' || (props.status === 'waiting_qr' && method.value === 'qr'))
// O WhatsApp troca o código a cada ~3 minutos; o bot guarda o mais recente.
usePolling(loadPairing, 5000, () => props.status === 'waiting_qr' && method.value === 'phone' && Boolean(pairing.value?.active))
</script>
