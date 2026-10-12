<template>
  <UDashboardPanel id="instances">
    <template #header>
      <UDashboardNavbar title="Instâncias">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton icon="i-nucleo-plus" @click="createOpen = true">Nova instância</UButton>
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <UInput v-model="search" icon="i-nucleo-magnifier" placeholder="Buscar instância…" class="w-full sm:w-64" />
        </template>
        <template #right>
          <UTabs v-model="statusFilter" :items="statusTabs" :content="false" size="xs" variant="pill" />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <UTable
        :data="filtered"
        :columns="columns"
        :loading="status === 'pending'"
        class="shrink-0"
        :ui="{ base: 'table-fixed border-separate border-spacing-0', thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none', tbody: '[&>tr]:last:[&>td]:border-b-0', th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r', td: 'border-b border-default' }"
        @select="(_e: Event, row: { original: Instance }) => navigateTo(`/instances/${row.original.slug}`)"
      >
        <template #name-cell="{ row }">
          <div class="flex min-w-0 items-center gap-3">
            <UAvatar :text="row.original.name.slice(0, 2).toUpperCase()" size="sm" :ui="{ root: 'bg-primary/10', fallback: 'text-primary text-xs font-semibold' }" />
            <div class="min-w-0">
              <p class="truncate font-medium text-highlighted">{{ row.original.name }}</p>
              <p class="truncate font-mono text-xs text-muted">{{ row.original.slug }}</p>
            </div>
          </div>
        </template>
        <template #status-cell="{ row }">
          <StatusBadge :status="row.original.status" size="sm" />
        </template>
        <template #repository-cell="{ row }">
          <span class="font-mono text-xs text-muted">{{ row.original.repositorySlug }}@{{ row.original.branch }}</span>
        </template>
        <template #updatedAt-cell="{ row }">
          <span class="text-sm text-muted">{{ timeAgo(row.original.updatedAt) }}</span>
        </template>
        <template #actions-cell="{ row }">
          <div class="flex justify-end" @click.stop>
            <InstanceActions :slug="row.original.slug" :status="row.original.status" size="xs" compact @changed="refresh" />
          </div>
        </template>
        <template #empty>
          <UEmpty
            icon="i-nucleo-robot"
            :title="instances?.length ? 'Nada encontrado' : 'Nenhuma instância'"
            :description="instances?.length ? 'Ajuste a busca ou o filtro.' : 'Crie uma instância para conectar um número de WhatsApp.'"
            variant="naked"
          />
        </template>
      </UTable>

      <InstanceCreateModal v-model:open="createOpen" />
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Instance } from '~/types'

useHead({ title: 'Instâncias · DeadByte' })

const route = useRoute()
const createOpen = ref(route.query.new === '1')
const search = ref('')
const statusFilter = ref('all')

const { data: instances, refresh, status } = await useApi<Instance[]>('/api/instances')
const { connected: live } = useRealtime({
  onMessage(message) {
    if (message.type === 'instance.status') void refresh()
  }
})
usePolling(refresh, 5000, () => !live.value)

const statusTabs = computed(() => {
  const list = instances.value ?? []
  return [
    { label: `Todas (${list.length})`, value: 'all' },
    { label: 'Online', value: 'online' },
    { label: 'Paradas', value: 'stopped' },
    { label: 'Problemas', value: 'problems' }
  ]
})

const filtered = computed(() => {
  const term = search.value.trim().toLowerCase()
  return (instances.value ?? []).filter((item) => {
    if (statusFilter.value === 'online' && !isRunningStatus(item.status)) return false
    if (statusFilter.value === 'stopped' && isRunningStatus(item.status)) return false
    if (statusFilter.value === 'problems' && !['error', 'crashed', 'disconnected'].includes(item.status)) return false
    return !term || [item.name, item.slug, item.clientId].some((value) => value.toLowerCase().includes(term))
  })
})

const columns: TableColumn<Instance>[] = [
  { accessorKey: 'name', header: 'Instância', meta: { class: { th: 'w-[34%]' } } },
  { accessorKey: 'status', header: 'Status' },
  { id: 'repository', header: 'Código' },
  { accessorKey: 'updatedAt', header: 'Atualizada' },
  { id: 'actions', header: '', meta: { class: { th: 'w-36' } } }
]
</script>
