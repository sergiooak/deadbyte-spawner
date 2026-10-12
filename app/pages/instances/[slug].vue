<template>
  <UDashboardPanel id="instance">
    <template #header>
      <UDashboardNavbar :ui="{ right: 'gap-2' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #title>
          <div class="flex min-w-0 items-center gap-3">
            <UButton to="/instances" icon="i-nucleo-arrow-left" color="neutral" variant="ghost" size="sm" aria-label="Voltar" />
            <span class="truncate">{{ instance?.name ?? slug }}</span>
            <StatusBadge v-if="instance" :status="instance.status" size="sm" />
          </div>
        </template>
        <template #right>
          <InstanceActions v-if="instance" :slug="slug" :status="instance.status" @changed="refreshAll" />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <UTabs v-model="tab" :items="tabs" :content="false" variant="link" size="sm" class="-mb-px" />
      </UDashboardToolbar>
    </template>

    <template #body>
      <UEmpty
        v-if="error?.statusCode === 404"
        icon="i-nucleo-magnifier-alert"
        title="Instância não encontrada"
        :actions="[{ label: 'Voltar para instâncias', to: '/instances' }]"
      />

      <template v-else-if="instance">
        <UAlert
          v-if="instance.status === 'crashed' || instance.status === 'error'"
          color="error"
          variant="subtle"
          icon="i-nucleo-skull"
          title="O bot parou com erro"
          description="Veja a aba Logs para entender o que aconteceu."
          :actions="[{ label: 'Ver logs', color: 'error', variant: 'outline', onClick: () => { tab = 'logs' } }]"
        />

        <!-- Visão geral -->
        <div v-if="tab === 'overview'" class="grid gap-6 xl:grid-cols-[minmax(0,22rem)_1fr]">
          <InstanceQrPanel :slug="slug" :status="instance.status" :last-ready-at="instance.lastReadyAt" />

          <div class="space-y-6">
            <UCard :ui="{ body: 'p-0 sm:p-0' }">
              <dl class="grid divide-default sm:grid-cols-2 [&>div]:border-default [&>div]:px-5 [&>div]:py-4 [&>div]:not-last:border-b sm:[&>div:nth-child(odd)]:border-r">
                <div v-for="item in details" :key="item.label" class="min-w-0">
                  <dt class="text-xs text-muted">{{ item.label }}</dt>
                  <dd class="mt-1 truncate text-sm text-highlighted" :class="item.mono ? 'font-mono' : ''" :title="String(item.value)">{{ item.value }}</dd>
                </div>
              </dl>
            </UCard>

            <UCard>
              <template #header>
                <div class="flex items-center justify-between">
                  <h3 class="font-pixel text-lg text-highlighted">Atividade recente</h3>
                  <UButton color="neutral" variant="link" size="sm" trailing-icon="i-nucleo-arrow-right" @click="tab = 'events'">Todos os eventos</UButton>
                </div>
              </template>
              <ActivityFeed :events="events ?? []" :command-names="commandNames" :limit="8" />
            </UCard>
          </div>
        </div>

        <!-- Comandos -->
        <InstanceCommandEditor
          v-else-if="tab === 'commands'"
          :slug="slug"
          :repository-slug="instance.repositorySlug"
          :commands="commands ?? []"
          :running="isRunningStatus(instance.status)"
          @saved="refreshCommands"
          @restart="restart"
        />

        <!-- Logs -->
        <LogViewer v-else-if="tab === 'logs'" v-model:auto-refresh="liveLogs" :logs="logs ?? []" height-class="h-[calc(100dvh-14rem)] min-h-96" />

        <!-- Eventos -->
        <!-- WhatsApp: perfil e configurações do número -->
        <InstanceWhatsappProfile v-else-if="tab === 'whatsapp'" :slug="slug" :status="instance.status" />

        <!-- Controle remoto -->
        <InstanceRemoteControl v-else-if="tab === 'remote'" :slug="slug" :status="instance.status" />

        <UCard v-else-if="tab === 'events'">
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <h3 class="font-pixel text-lg text-highlighted">Atividade</h3>
              <div class="flex flex-wrap items-center gap-3">
                <USwitch v-if="activityMode !== 'debug'" v-model="showIgnored" size="sm" label="Mensagens sem comando" />
                <UTabs v-model="activityMode" :items="activityModes" :content="false" size="xs" variant="pill" />
              </div>
            </div>
          </template>
          <ActivityFeed :events="events ?? []" :command-names="commandNames" :hide-ignored="!showIgnored" :mode="activityMode" />
        </UCard>

        <!-- Configurações -->
        <div v-else-if="tab === 'settings'" class="mx-auto w-full max-w-3xl space-y-6">
          <UPageCard title="Geral" description="Nome exibido e comportamento ao reiniciar o servidor." variant="subtle">
            <UForm :state="settings" class="space-y-4" @submit="saveSettings">
              <UFormField label="Nome" name="name">
                <UInput v-model="settings.name" class="w-full" />
              </UFormField>
              <USwitch
                v-model="settings.autoStart"
                label="Iniciar automaticamente"
                description="Depois de um deploy ou reinício do container, o bot sobe sozinho e reconecta a sessão salva."
              />
              <div class="flex justify-end">
                <UButton type="submit" icon="i-nucleo-floppy-disk" :loading="savingSettings">Salvar</UButton>
              </div>
            </UForm>
          </UPageCard>

          <UPageCard title="Enviar mensagem de teste" description="Manda uma mensagem pelo bot. Use o ID do chat, ex.: 5534999999999@c.us" variant="subtle">
            <UForm :state="message" class="space-y-4" @submit="sendMessage">
              <UFormField label="Chat ID" name="chatId">
                <UInput v-model="message.chatId" placeholder="55DDDNUMERO@c.us" class="w-full font-mono" />
              </UFormField>
              <UFormField label="Mensagem" name="text">
                <UTextarea v-model="message.text" :rows="3" autoresize class="w-full" />
              </UFormField>
              <div class="flex justify-end">
                <UButton type="submit" icon="i-nucleo-paper-plane-2" :loading="sending" :disabled="instance.status !== 'ready' || !message.chatId || !message.text">Enviar</UButton>
              </div>
            </UForm>
          </UPageCard>

          <UPageCard title="Zona de perigo" variant="subtle" :ui="{ root: 'ring-error/30', title: 'text-error' }">
            <div class="divide-y divide-default">
              <div class="flex flex-wrap items-center justify-between gap-3 pb-4">
                <div>
                  <p class="font-medium text-highlighted">Desconectar WhatsApp</p>
                  <p class="text-sm text-muted">Para o bot e apaga a sessão salva. Vai precisar escanear o QR de novo.</p>
                </div>
                <UButton color="warning" variant="soft" icon="i-nucleo-link-broken" @click="clearSessionOpen = true">Limpar sessão</UButton>
              </div>
              <div class="flex flex-wrap items-center justify-between gap-3 pt-4">
                <div>
                  <p class="font-medium text-highlighted">Excluir instância</p>
                  <p class="text-sm text-muted">Remove a instância, logs, eventos e sessão. Não dá para desfazer.</p>
                </div>
                <UButton color="error" icon="i-nucleo-trash" @click="deleteOpen = true">Excluir</UButton>
              </div>
            </div>
          </UPageCard>
        </div>
      </template>

      <ConfirmModal
        v-model:open="clearSessionOpen"
        title="Limpar sessão do WhatsApp?"
        description="O bot será parado e desconectado. Para voltar, inicie e escaneie o QR."
        action-label="Limpar sessão"
        color="warning"
        icon="i-nucleo-link-broken"
        :action="clearSession"
      />
      <ConfirmModal
        v-model:open="deleteOpen"
        title="Excluir instância?"
        description="Logs, eventos, configuração de comandos e sessão serão apagados."
        action-label="Excluir para sempre"
        :confirm-text="slug"
        icon="i-nucleo-trash"
        :action="deleteInstance"
      />
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui'
import type { Instance, InstanceCommand, ProcessLog, RuntimeEvent } from '~/types'

const route = useRoute()
const slug = computed(() => String(route.params.slug))

const validTabs = ['overview', 'commands', 'whatsapp', 'remote', 'logs', 'events', 'settings']
const tab = computed({
  get: () => (validTabs.includes(String(route.query.tab)) ? String(route.query.tab) : 'overview'),
  set: (value: string) => navigateTo({ query: { ...route.query, tab: value === 'overview' ? undefined : value } }, { replace: true })
})

const { data: instance, refresh: refreshInstance, error } = await useApi<Instance>(() => `/api/instances/${slug.value}`)
const { data: commands, refresh: refreshCommands } = await useApi<InstanceCommand[]>(() => `/api/instances/${slug.value}/commands`)
const { data: logs, refresh: refreshLogs } = await useApi<ProcessLog[]>(() => `/api/instances/${slug.value}/logs`, { query: { limit: 500 } })
const { data: events, refresh: refreshEvents } = await useApi<RuntimeEvent[]>(() => `/api/instances/${slug.value}/events`, { query: { limit: 400 } })
const showIgnored = ref(false)
const activityModes = [
  { label: 'Simples', icon: 'i-nucleo-bullet-list', value: 'simple' },
  { label: 'Detalhado', icon: 'i-nucleo-sliders', value: 'detailed' },
  { label: 'Debug', icon: 'i-nucleo-console', value: 'debug' }
]
// Modo preferido fica salvo neste navegador.
const activityMode = ref<'simple' | 'detailed' | 'debug'>('simple')
onMounted(() => {
  try {
    const saved = localStorage.getItem('deadbyte:activity-mode')
    if (saved === 'simple' || saved === 'detailed' || saved === 'debug') activityMode.value = saved
  } catch {
    // armazenamento indisponível: fica no padrão
  }
})
watch(activityMode, (value) => {
  try {
    localStorage.setItem('deadbyte:activity-mode', value)
  } catch {
    // sem persistência, sem problema
  }
})
const commandNames = computed(() => new Map((commands.value ?? []).map((item) => [item.commandKey, item.name])))

useHead({ title: () => `${instance.value?.name ?? 'Instância'} · DeadByte` })

const liveLogs = ref(true)
const enabledCommands = computed(() => (commands.value ?? []).filter((item) => item.enabled).length)

const tabs = computed<TabsItem[]>(() => [
  { label: 'Visão geral', icon: 'i-nucleo-gauge', value: 'overview' },
  { label: 'Comandos', icon: 'i-nucleo-console', value: 'commands', badge: commands.value?.length ? { label: String(enabledCommands.value), color: 'neutral', variant: 'soft' } : undefined },
  { label: 'Logs', icon: 'i-nucleo-scroll', value: 'logs' },
  { label: 'WhatsApp', icon: 'i-nucleo-mobile-check', value: 'whatsapp' },
  { label: 'Controle remoto', icon: 'i-nucleo-chat-bubble', value: 'remote' },
  { label: 'Atividade', icon: 'i-nucleo-heartbeat', value: 'events' },
  { label: 'Configurações', icon: 'i-nucleo-sliders', value: 'settings' }
])

async function refreshAll() {
  await Promise.all([refreshInstance(), refreshEvents(), refreshLogs()])
}

// Tempo real: eventos, status e linhas de log chegam pelo WebSocket; o polling só roda se ele cair.
const { connected: live } = useRealtime({
  slugs: () => [slug.value],
  logs: () => tab.value === 'logs' && liveLogs.value,
  onMessage(message) {
    if (!('slug' in message) || message.slug !== slug.value) return
    if (message.type === 'instance.status') void refreshInstance()
    if (message.type === 'instance.event' && events.value) events.value = [message.event, ...events.value].slice(0, 400)
    if (message.type === 'instance.log' && logs.value && liveLogs.value) {
      logs.value = [{ id: Date.now() + Math.random(), instanceSlug: slug.value, ...message.log }, ...logs.value].slice(0, 1000)
    }
  }
})

usePolling(() => refreshInstance(), 3000, () => !live.value)
usePolling(() => refreshEvents(), 5000, () => !live.value)
usePolling(() => refreshLogs(), 2500, () => !live.value && tab.value === 'logs' && liveLogs.value)
// Reserva leve mesmo com WebSocket (ex.: mudanças feitas por outra aba).
usePolling(() => refreshInstance(), 30_000)

const details = computed(() => {
  const item = instance.value
  if (!item) return []
  return [
    { label: 'Client ID', value: item.clientId, mono: true },
    { label: 'Repositório', value: `${item.repositorySlug}@${item.branch}`, mono: true },
    { label: 'Commit', value: shortHash(item.commitHash), mono: true },
    { label: 'Porta interna', value: item.internalPort ? `${item.internalHost}:${item.internalPort}` : '—', mono: true },
    { label: 'Iniciada', value: formatDateTime(item.startedAt) },
    { label: 'Último ready', value: formatDateTime(item.lastReadyAt) },
    { label: 'Comandos ativos', value: `${enabledCommands.value} de ${commands.value?.length ?? 0}` },
    { label: 'Auto-start', value: item.autoStart ? 'Ligado' : 'Desligado' }
  ]
})

// Configurações
const settings = reactive({ name: '', autoStart: false })
const savingSettings = ref(false)
watch(instance, (value) => {
  if (value && !savingSettings.value) {
    settings.name = value.name
    settings.autoStart = value.autoStart
  }
}, { immediate: true })

async function saveSettings() {
  savingSettings.value = true
  await withToast(() => apiRequest(`/api/instances/${slug.value}`, { method: 'PATCH', body: settings }), {
    success: 'Configurações salvas',
    error: 'Não foi possível salvar'
  })
  savingSettings.value = false
  await refreshInstance()
}

const message = reactive({ chatId: '', text: '' })
const sending = ref(false)

async function sendMessage() {
  sending.value = true
  const result = await withToast(() => apiRequest(`/api/instances/${slug.value}/send-message`, { method: 'POST', body: message }), {
    success: 'Mensagem enviada',
    error: 'Não foi possível enviar'
  })
  sending.value = false
  if (result) message.text = ''
}

async function restart() {
  await withToast(() => apiRequest(`/api/instances/${slug.value}/restart`, { method: 'POST' }), {
    success: 'Instância reiniciando',
    error: 'Não foi possível reiniciar'
  })
  await refreshInstance()
}

const clearSessionOpen = ref(false)
const deleteOpen = ref(false)

async function clearSession() {
  await withToast(() => apiRequest(`/api/instances/${slug.value}/clear-session`, { method: 'POST' }), {
    success: 'Sessão apagada',
    error: 'Não foi possível limpar a sessão'
  })
  await refreshInstance()
}

async function deleteInstance() {
  const result = await withToast(() => apiRequest(`/api/instances/${slug.value}`, { method: 'DELETE' }), {
    success: 'Instância excluída',
    error: 'Não foi possível excluir'
  })
  if (result) await navigateTo('/instances')
}
</script>
