<template>
  <UDashboardPanel id="repository">
    <template #header>
      <UDashboardNavbar :ui="{ right: 'gap-2' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #title>
          <div class="flex min-w-0 items-center gap-3">
            <UButton to="/repositories" icon="i-lucide-arrow-left" color="neutral" variant="ghost" size="sm" aria-label="Voltar" />
            <span class="truncate">{{ repository?.name ?? slug }}</span>
          </div>
        </template>
        <template #right>
          <UButton icon="i-lucide-refresh-cw" :loading="syncing" :disabled="!repository" @click="sync">
            {{ syncing ? 'Sincronizando…' : 'Sincronizar' }}
          </UButton>
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <UTabs v-model="tab" :items="tabs" :content="false" variant="link" size="sm" class="-mb-px" />
      </UDashboardToolbar>
    </template>

    <template #body>
      <UEmpty
        v-if="error?.statusCode === 404"
        icon="i-lucide-search-x"
        title="Repositório não encontrado"
        :actions="[{ label: 'Voltar', to: '/repositories' }]"
      />

      <template v-else-if="repository">
        <UAlert
          v-if="syncing"
          color="info"
          variant="subtle"
          icon="i-lucide-loader-circle"
          title="Sincronizando"
          description="Clonando, instalando dependências, buildando e lendo o manifesto. A primeira vez pode levar alguns minutos."
          :ui="{ icon: 'animate-spin' }"
        >
          <template #description>
            <p>Clonando, instalando dependências, buildando e lendo o manifesto. A primeira vez pode levar alguns minutos.</p>
            <UProgress class="mt-3" size="xs" />
          </template>
        </UAlert>

        <UAlert
          v-else-if="syncError"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-x"
          title="A sincronização falhou"
          close
          @update:open="syncError = ''"
        >
          <template #description>
            <pre class="log-scroll mt-1 max-h-48 overflow-auto font-mono text-xs whitespace-pre-wrap">{{ syncError }}</pre>
          </template>
        </UAlert>

        <UAlert
          v-else-if="lastSync"
          color="success"
          variant="subtle"
          icon="i-lucide-circle-check"
          title="Sincronizado"
          :description="`${lastSync.addedCommands} novos · ${lastSync.updatedCommands} atualizados · ${lastSync.removedCommands} removidos · commit ${shortHash(lastSync.commitHash)} · ${(lastSync.durationMs / 1000).toFixed(0)}s`"
          close
          @update:open="lastSync = null"
        />

        <UAlert
          v-if="!commands?.length && !syncing"
          color="warning"
          variant="subtle"
          icon="i-lucide-download"
          title="Ainda não sincronizado"
          description="Sincronize para baixar o código e importar os comandos antes de criar instâncias."
        />

        <!-- Comandos -->
        <div v-if="tab === 'commands'" class="space-y-4">
          <div class="flex flex-wrap items-center gap-2">
            <UInput v-model="search" icon="i-lucide-search" placeholder="Buscar comando…" class="w-full sm:w-72" />
            <USelect v-model="statusFilter" :items="statusItems" class="w-full sm:w-40" />
            <p class="ms-auto text-sm text-muted">{{ activeCount }} comandos ativos</p>
          </div>
          <UTable :data="filteredCommands" :columns="columns" :ui="{ td: 'align-top' }">
            <template #name-cell="{ row }">
              <div class="min-w-0 max-w-md">
                <p class="font-medium text-highlighted">{{ row.original.name }}</p>
                <p class="font-mono text-xs text-dimmed">{{ row.original.commandKey }}</p>
                <p v-if="row.original.description" class="mt-0.5 text-xs whitespace-normal text-muted">{{ row.original.description }}</p>
              </div>
            </template>
            <template #group-cell="{ row }">
              <UBadge color="neutral" variant="soft">{{ row.original.group }}</UBadge>
            </template>
            <template #supports-cell="{ row }">
              <div class="flex gap-1">
                <UTooltip v-if="row.original.supportsPrivate" text="Privado"><UIcon name="i-lucide-user" class="size-4 text-muted" /></UTooltip>
                <UTooltip v-if="row.original.supportsGroups" text="Grupos"><UIcon name="i-lucide-users" class="size-4 text-muted" /></UTooltip>
                <UTooltip v-if="row.original.supportsImplicit" text="Implícito (sem prefixo)"><UIcon name="i-lucide-sparkles" class="size-4 text-muted" /></UTooltip>
              </div>
            </template>
            <template #status-cell="{ row }">
              <UBadge :color="row.original.status === 'active' ? 'success' : 'neutral'" variant="subtle">
                {{ row.original.status === 'active' ? 'ativo' : row.original.status === 'removed' ? 'removido' : 'obsoleto' }}
              </UBadge>
            </template>
            <template #empty>
              <UEmpty icon="i-lucide-terminal-square" title="Nenhum comando" variant="naked" />
            </template>
          </UTable>
        </div>

        <!-- Versões -->
        <UCard v-else-if="tab === 'versions'" :ui="{ body: 'p-0 sm:p-0' }">
          <UEmpty v-if="!versions?.length" icon="i-lucide-history" title="Nenhuma versão sincronizada" variant="naked" class="py-10" />
          <ul v-else class="divide-y divide-default">
            <li v-for="(version, index) in versions" :key="version.id" class="flex items-center gap-4 px-5 py-3">
              <UIcon name="i-lucide-git-commit-horizontal" class="size-5 shrink-0 text-muted" />
              <div class="min-w-0 flex-1">
                <p class="text-sm text-highlighted">
                  <span class="font-mono">{{ shortHash(version.commitHash) }}</span>
                  <span class="text-muted"> · {{ version.branch }}</span>
                  <span v-if="version.version" class="text-muted"> · v{{ version.version }}</span>
                </p>
                <p class="text-xs text-muted">{{ formatDateTime(version.createdAt) }}</p>
              </div>
              <UBadge v-if="index === 0" color="primary" variant="subtle">atual</UBadge>
            </li>
          </ul>
        </UCard>

        <!-- Configurações -->
        <div v-else-if="tab === 'settings'" class="mx-auto w-full max-w-3xl space-y-6">
          <UPageCard title="Repositório" description="Origem do código do bot." variant="subtle">
            <UForm :state="form" class="space-y-4" @submit="save">
              <div class="grid gap-4 sm:grid-cols-2">
                <UFormField label="Nome" name="name"><UInput v-model="form.name" class="w-full" /></UFormField>
                <UFormField label="Branch padrão" name="defaultBranch"><UInput v-model="form.defaultBranch" class="w-full font-mono" /></UFormField>
              </div>
              <UFormField label="URL do git" name="repositoryUrl"><UInput v-model="form.repositoryUrl" class="w-full font-mono" /></UFormField>
              <USeparator label="Comandos de build" />
              <div class="grid gap-4 sm:grid-cols-2">
                <UFormField label="Instalar" name="installCommand"><UInput v-model="form.installCommand" class="w-full font-mono" /></UFormField>
                <UFormField label="Buildar" name="buildCommand"><UInput v-model="form.buildCommand" class="w-full font-mono" /></UFormField>
                <UFormField label="Manifesto" name="manifestCommand"><UInput v-model="form.manifestCommand" class="w-full font-mono" /></UFormField>
                <UFormField label="Iniciar" name="startCommand"><UInput v-model="form.startCommand" class="w-full font-mono" /></UFormField>
              </div>
              <div class="flex justify-end">
                <UButton type="submit" icon="i-lucide-save" :loading="saving">Salvar</UButton>
              </div>
            </UForm>
          </UPageCard>

          <UPageCard title="Zona de perigo" variant="subtle" :ui="{ root: 'ring-error/30', title: 'text-error' }">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p class="font-medium text-highlighted">Excluir repositório</p>
                <p class="text-sm text-muted">Só é possível quando nenhuma instância usa este repositório.</p>
              </div>
              <UButton color="error" icon="i-lucide-trash-2" @click="deleteOpen = true">Excluir</UButton>
            </div>
          </UPageCard>
        </div>
      </template>

      <ConfirmModal
        v-model:open="deleteOpen"
        title="Excluir repositório?"
        description="Comandos, versões e o código clonado serão apagados."
        action-label="Excluir"
        :confirm-text="slug"
        icon="i-lucide-trash-2"
        :action="remove"
      />
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import type { TableColumn, TabsItem } from '@nuxt/ui'
import type { Repository, RepositoryCommand, RepositoryVersion, SyncResult } from '~/types'

const route = useRoute()
const slug = computed(() => String(route.params.slug))

const { data: repository, refresh: refreshRepository, error } = await useApi<Repository>(() => `/api/repositories/${slug.value}`)
const { data: commands, refresh: refreshCommands } = await useApi<RepositoryCommand[]>(() => `/api/repositories/${slug.value}/commands`)
const { data: versions, refresh: refreshVersions } = await useApi<RepositoryVersion[]>(() => `/api/repositories/${slug.value}/versions`)

useHead({ title: () => `${repository.value?.name ?? 'Repositório'} · DeadByte` })

const tab = ref('commands')
const tabs = computed<TabsItem[]>(() => [
  { label: 'Comandos', icon: 'i-lucide-terminal-square', value: 'commands', badge: activeCount.value ? { label: String(activeCount.value), color: 'neutral', variant: 'soft' } : undefined },
  { label: 'Versões', icon: 'i-lucide-history', value: 'versions' },
  { label: 'Configurações', icon: 'i-lucide-settings-2', value: 'settings' }
])

// Sincronização
const syncRequested = ref(false)
const syncing = computed(() => syncRequested.value || Boolean(repository.value?.syncing))
const syncError = ref('')
const lastSync = ref<SyncResult | null>(null)

async function sync() {
  syncRequested.value = true
  syncError.value = ''
  lastSync.value = null
  try {
    lastSync.value = await apiRequest<SyncResult>(`/api/repositories/${slug.value}/sync-manifest`, { method: 'POST' })
    useToast().add({ title: 'Repositório sincronizado', color: 'success', icon: 'i-lucide-circle-check' })
  } catch (err) {
    syncError.value = errorMessage(err, 'Falha desconhecida.')
  } finally {
    syncRequested.value = false
    await Promise.all([refreshRepository(), refreshCommands(), refreshVersions()])
  }
}

// Sync iniciado em outra aba ou logo após o cadastro.
usePolling(refreshRepository, 4000, () => Boolean(repository.value?.syncing) && !syncRequested.value)
watch(() => repository.value?.syncing, (now, before) => {
  if (before && !now) void Promise.all([refreshCommands(), refreshVersions()])
})

onMounted(() => {
  if (route.query.sync === '1') {
    void navigateTo({ query: {} }, { replace: true })
    void sync()
  }
})

// Comandos
const search = ref('')
const statusFilter = ref('active')
const statusItems = [
  { label: 'Ativos', value: 'active' },
  { label: 'Removidos', value: 'removed' },
  { label: 'Todos', value: 'all' }
]
const activeCount = computed(() => (commands.value ?? []).filter((item) => item.status === 'active').length)
const filteredCommands = computed(() => {
  const term = search.value.trim().toLowerCase()
  return (commands.value ?? [])
    .filter((item) => statusFilter.value === 'all' || item.status === statusFilter.value)
    .filter((item) => !term || [item.name, item.commandKey, item.group, item.description ?? ''].some((value) => value.toLowerCase().includes(term)))
    .sort((a, b) => a.group.localeCompare(b.group) || a.commandKey.localeCompare(b.commandKey))
})
const columns: TableColumn<RepositoryCommand>[] = [
  { accessorKey: 'name', header: 'Comando' },
  { accessorKey: 'group', header: 'Grupo' },
  { id: 'supports', header: 'Onde' },
  { accessorKey: 'status', header: 'Status' }
]

// Configurações
const form = reactive({ name: '', repositoryUrl: '', defaultBranch: '', installCommand: '', buildCommand: '', manifestCommand: '', startCommand: '' })
watch(repository, (value) => {
  if (value) {
    Object.assign(form, {
      name: value.name,
      repositoryUrl: value.repositoryUrl,
      defaultBranch: value.defaultBranch,
      installCommand: value.installCommand,
      buildCommand: value.buildCommand,
      manifestCommand: value.manifestCommand,
      startCommand: value.startCommand
    })
  }
}, { immediate: true })
const saving = ref(false)

async function save() {
  saving.value = true
  await withToast(() => apiRequest(`/api/repositories/${slug.value}`, { method: 'PATCH', body: form }), {
    success: 'Repositório atualizado',
    error: 'Não foi possível salvar'
  })
  saving.value = false
  await refreshRepository()
}

const deleteOpen = ref(false)
async function remove() {
  const result = await withToast(() => apiRequest(`/api/repositories/${slug.value}`, { method: 'DELETE' }), {
    success: 'Repositório excluído',
    error: 'Não foi possível excluir'
  })
  if (result) await navigateTo('/repositories')
}
</script>
