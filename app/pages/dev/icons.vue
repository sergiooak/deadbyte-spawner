<template>
  <UDashboardPanel id="dev-icons">
    <template #header>
      <UDashboardNavbar title="Ícones Nucleo Pixel">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4">
        <p class="font-mono text-xs text-muted">
          Busca por nome e tags, em inglês. Clique para copiar <span class="text-primary">i-nucleo-&lt;nome&gt;</span>. Depois de usar um ícone novo, rode
          <span class="text-primary">pnpm icons:build</span> e registre a escolha em <span class="text-primary">icons/map.json</span>.
        </p>
        <UInput v-model="query" icon="i-nucleo-magnifier" placeholder="termos em inglês" class="w-full max-w-xl" />
        <UAlert v-if="error" color="warning" variant="subtle" icon="i-nucleo-triangle-warning" :description="error.statusMessage" />
        <div class="grid grid-cols-3 gap-px bg-(--ui-border) sm:grid-cols-6 lg:grid-cols-9">
          <UTooltip v-for="hit in hits" :key="hit.name" :text="hit.tags">
            <button
              type="button"
              class="flex flex-col items-center gap-2 bg-black p-4 text-highlighted transition hover:bg-primary/10 hover:text-primary"
              @click="copy(hit.name)"
            >
              <UIcon :name="`i-nucleo-${hit.name}`" class="size-6" />
              <span class="w-full truncate font-mono text-[10px] text-muted">{{ copied === hit.name ? 'copiado' : hit.name }}</span>
            </button>
          </UTooltip>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
type Hit = { name: string; tags: string; score: number }

useHead({ title: 'Ícones · DeadByte' })

const query = ref('robot bot')
const debounced = ref(query.value)
let timer: ReturnType<typeof setTimeout> | undefined
watch(query, (value) => {
  clearTimeout(timer)
  timer = setTimeout(() => (debounced.value = value), 250)
})

const { data: hits, error } = await useApi<Hit[]>('/api/_dev/nucleo', { query: { q: debounced } })

const copied = ref('')
async function copy(name: string) {
  await navigator.clipboard.writeText(`i-nucleo-${name}`)
  copied.value = name
}
</script>
