<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-2">
      <UInput v-model="search" icon="i-lucide-search" placeholder="Buscar comando ou alias…" class="w-full sm:w-72">
        <template v-if="search" #trailing>
          <UButton color="neutral" variant="link" size="sm" icon="i-lucide-x" aria-label="Limpar busca" @click="search = ''" />
        </template>
      </UInput>
      <USelect v-model="group" :items="groupItems" class="w-full sm:w-44" />
      <USelect v-model="visibility" :items="visibilityItems" class="w-full sm:w-40" />
      <p class="ms-auto text-sm text-muted tabular-nums">
        {{ enabledCount }} de {{ rows.length }} ativos
      </p>
    </div>

    <UAlert
      v-if="needsRestart"
      color="info"
      variant="subtle"
      icon="i-lucide-info"
      title="Alterações salvas"
      description="Reinicie a instância para o bot carregar a nova configuração."
      :actions="restartActions"
    />

    <UEmpty
      v-if="!rows.length"
      icon="i-lucide-terminal-square"
      title="Nenhum comando"
      description="Sincronize o repositório para importar os comandos do manifesto do bot."
      :actions="[{ label: 'Ir para o repositório', to: `/repositories/${repositorySlug}`, icon: 'i-lucide-git-branch' }]"
    />

    <div v-else class="space-y-6">
      <section v-for="section in groupedRows" :key="section.group">
        <div class="mb-2 flex items-center gap-2">
          <h3 class="text-xs font-semibold tracking-wide text-muted uppercase">{{ section.group }}</h3>
          <UBadge color="neutral" variant="soft" size="sm">{{ section.items.length }}</UBadge>
        </div>
        <div class="divide-y divide-default overflow-hidden rounded-lg ring ring-default">
          <div
            v-for="row in section.items"
            :key="row.commandId"
            class="grid gap-3 p-3 transition-colors sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,1.2fr)_auto] sm:items-center"
            :class="[isDirty(row) ? 'bg-primary/5' : 'bg-default', row.enabled ? '' : 'opacity-70']"
          >
            <USwitch v-model="row.enabled" :aria-label="`Ativar ${row.name}`" />
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <p class="truncate font-medium text-highlighted">{{ row.name }}</p>
                <UBadge v-if="isDirty(row)" color="primary" variant="soft" size="sm">editado</UBadge>
              </div>
              <p class="truncate font-mono text-xs text-dimmed">{{ row.commandKey }}</p>
              <p v-if="row.description" class="mt-0.5 line-clamp-2 text-xs text-muted">{{ row.description }}</p>
            </div>
            <UInputTags
              v-model="row.aliases"
              placeholder="Adicionar alias…"
              size="sm"
              class="w-full"
              :add-on-blur="true"
              :add-on-paste="true"
            />
            <UTooltip text="Só o dono do bot pode usar">
              <UCheckbox v-model="row.ownerOnly" label="Só dono" />
            </UTooltip>
          </div>
        </div>
      </section>
    </div>

    <div
      v-if="dirtyRows.length"
      class="sticky bottom-4 z-10 mx-auto flex w-fit items-center gap-3 rounded-full bg-inverted px-4 py-2 text-inverted shadow-xl"
    >
      <span class="text-sm">{{ dirtyRows.length }} {{ dirtyRows.length === 1 ? 'alteração' : 'alterações' }}</span>
      <UButton size="sm" color="neutral" variant="ghost" class="text-inverted hover:bg-white/10" @click="reset">Descartar</UButton>
      <UButton size="sm" icon="i-lucide-save" :loading="saving" class="rounded-full" @click="save">Salvar</UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { InstanceCommand } from '~/types'

const props = defineProps<{ slug: string; repositorySlug: string; commands: InstanceCommand[]; running: boolean }>()
const emit = defineEmits<{ saved: []; restart: [] }>()

type EditableRow = InstanceCommand & { aliases: string[] }

const rows = ref<EditableRow[]>([])
const search = ref('')
const group = ref('all')
const visibility = ref<'all' | 'enabled' | 'disabled'>('all')
const saving = ref(false)
const needsRestart = ref(false)

function snapshot(command: InstanceCommand) {
  return JSON.stringify([command.enabled, command.ownerOnly, command.aliases])
}

const originals = computed(() => new Map(props.commands.map((command) => [command.commandId, snapshot(command)])))

function reset() {
  rows.value = props.commands.map((command) => ({ ...command, aliases: [...command.aliases] }))
}

watch(() => props.commands, reset, { immediate: true })

function isDirty(row: EditableRow) {
  return originals.value.get(row.commandId) !== snapshot(row)
}

const dirtyRows = computed(() => rows.value.filter(isDirty))
const enabledCount = computed(() => rows.value.filter((row) => row.enabled).length)

const groupItems = computed(() => [
  { label: 'Todos os grupos', value: 'all' },
  ...[...new Set(props.commands.map((command) => command.group))].sort().map((name) => ({ label: name, value: name }))
])

const visibilityItems = [
  { label: 'Todos', value: 'all' },
  { label: 'Ativos', value: 'enabled' },
  { label: 'Desativados', value: 'disabled' }
]

const groupedRows = computed(() => {
  const term = search.value.trim().toLowerCase()
  const filtered = rows.value.filter((row) => {
    if (group.value !== 'all' && row.group !== group.value) return false
    if (visibility.value === 'enabled' && !row.enabled) return false
    if (visibility.value === 'disabled' && row.enabled) return false
    if (!term) return true
    return [row.name, row.commandKey, row.description ?? '', ...row.aliases].some((value) => value.toLowerCase().includes(term))
  })
  const groups = new Map<string, EditableRow[]>()
  for (const row of filtered) {
    groups.set(row.group, [...(groups.get(row.group) ?? []), row])
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([name, items]) => ({ group: name, items }))
})

const restartActions = computed(() =>
  props.running ? [{ label: 'Reiniciar agora', icon: 'i-lucide-rotate-cw', color: 'info' as const, onClick: () => { needsRestart.value = false; emit('restart') } }] : []
)

async function save() {
  saving.value = true
  const payload = dirtyRows.value.map((row) => ({
    commandId: row.commandId,
    enabled: row.enabled,
    ownerOnly: row.ownerOnly,
    aliases: row.aliases.map((alias) => alias.trim()).filter(Boolean)
  }))
  const result = await withToast(
    () => apiRequest(`/api/instances/${props.slug}/commands`, { method: 'PATCH', body: { commands: payload } }),
    { success: 'Comandos atualizados', error: 'Não foi possível salvar' }
  )
  saving.value = false
  if (result) {
    needsRestart.value = props.running
    emit('saved')
  }
}
</script>
