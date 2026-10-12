<template>
  <UDashboardPanel id="settings">
    <template #header>
      <UDashboardNavbar title="Configurações">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="settings" class="mx-auto w-full max-w-3xl space-y-6">
        <UPageCard title="Servidor" description="Ambiente onde o spawner está rodando." variant="subtle">
          <dl class="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <div v-for="item in server" :key="item.label">
              <dt class="text-xs text-muted">{{ item.label }}</dt>
              <dd class="mt-0.5 truncate font-mono text-sm text-highlighted" :title="item.value">{{ item.value }}</dd>
            </div>
          </dl>
        </UPageCard>

        <UPageCard title="Bots" description="Valores usados ao iniciar cada instância." variant="subtle">
          <dl class="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <div v-for="item in bot" :key="item.label">
              <dt class="text-xs text-muted">{{ item.label }}</dt>
              <dd class="mt-0.5 truncate font-mono text-sm" :class="item.value === 'não definido' ? 'text-warning' : 'text-highlighted'" :title="item.value">{{ item.value }}</dd>
            </div>
          </dl>
        </UPageCard>

        <UPageCard title="Segredos" description="Só mostramos se cada variável existe. Os valores ficam na Coolify." variant="subtle">
          <ul class="divide-y divide-default">
            <li v-for="(isSet, name) in settings.secrets" :key="name" class="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <span class="font-mono text-sm text-highlighted">{{ name }}</span>
              <UBadge :color="isSet ? 'success' : 'neutral'" variant="subtle" :icon="isSet ? 'i-nucleo-check' : 'i-nucleo-minus'">
                {{ isSet ? 'definida' : 'ausente' }}
              </UBadge>
            </li>
          </ul>
        </UPageCard>

        <UPageCard title="Armazenamento" description="Monte esse diretório num volume persistente para não perder sessões no redeploy." variant="subtle">
          <dl class="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <div v-for="(path, key) in settings.paths" :key="key">
              <dt class="text-xs text-muted capitalize">{{ key }}</dt>
              <dd class="mt-0.5 truncate font-mono text-sm text-highlighted" :title="path">{{ path }}</dd>
            </div>
          </dl>
        </UPageCard>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import type { SpawnerSettings } from '~/types'

useHead({ title: 'Configurações · DeadByte' })

const { data: settings } = await useApi<SpawnerSettings>('/api/settings')

const server = computed(() => {
  const value = settings.value
  if (!value) return []
  return [
    { label: 'Node.js', value: value.nodeVersion },
    { label: 'Plataforma', value: value.platform },
    { label: 'No ar há', value: formatDuration(value.uptimeSeconds) },
    { label: 'Bots rodando', value: value.runningInstances.length ? value.runningInstances.join(', ') : 'nenhum' }
  ]
})

const bot = computed(() => {
  const value = settings.value?.bot
  if (!value) return []
  const show = (item: string | null) => item ?? 'não definido'
  return [
    { label: 'Repositório padrão', value: value.defaultRepositoryUrl },
    { label: 'Branch padrão', value: value.defaultBranch },
    { label: 'Chromium', value: show(value.chromePath) },
    { label: 'FFmpeg', value: show(value.ffmpegPath) },
    { label: 'rembg', value: show(value.rembgUrl) },
    { label: 'Portas internas', value: `${value.internalHost}:${value.portRange}` },
    { label: 'Retenção de logs', value: `${value.logRetentionDays} dias` }
  ]
})
</script>
