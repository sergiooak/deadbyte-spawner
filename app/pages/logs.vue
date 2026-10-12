<template>
  <UDashboardPanel id="logs">
    <template #header>
      <UDashboardNavbar title="Logs">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <USelect
            v-model="selected"
            :items="items"
            placeholder="Escolha a instância"
            icon="i-lucide-bot"
            class="w-56"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UEmpty
        v-if="!instances?.length"
        icon="i-lucide-scroll-text"
        title="Sem instâncias"
        description="Os logs aparecem aqui quando alguma instância estiver rodando."
        variant="subtle"
      />
      <LogViewer v-else v-model:auto-refresh="live" :logs="logs ?? []" show-events height-class="h-[calc(100dvh-9rem)] min-h-96" />
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import type { Instance, ProcessLog } from '~/types'

useHead({ title: 'Logs · DeadByte' })

const route = useRoute()
const { data: instances } = await useApi<Instance[]>('/api/instances')
const selected = ref(typeof route.query.instance === 'string' ? route.query.instance : '')
const live = ref(true)

const items = computed(() => (instances.value ?? []).map((item) => ({ label: item.name, value: item.slug })))

watchEffect(() => {
  if (!selected.value && instances.value?.[0]) selected.value = instances.value[0].slug
})

const { data: logs, refresh } = await useApi<ProcessLog[]>(() => `/api/instances/${selected.value || '_'}/logs`, {
  query: { limit: 1000 },
  immediate: Boolean(selected.value),
  watch: [selected]
})

usePolling(refresh, 2500, () => live.value && Boolean(selected.value))
</script>
