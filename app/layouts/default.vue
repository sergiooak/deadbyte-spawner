<template>
  <UDashboardGroup unit="rem" storage="local">
    <UDashboardSidebar
      id="main"
      v-model:open="sidebarOpen"
      collapsible
      resizable
      :default-size="15"
      :min-size="13"
      :max-size="20"
      class="bg-black"
      :ui="{ footer: 'lg:border-t lg:border-default', header: 'border-b border-default' }"
    >
      <template #header="{ collapsed }">
        <NuxtLink to="/" class="flex min-w-0 items-center gap-2.5" :class="collapsed ? 'mx-auto' : 'px-1'">
          <AppLogo class="size-7 shrink-0" />
          <div v-if="!collapsed" class="min-w-0 leading-none">
            <p class="truncate font-pixel text-base neon-text">DeadByte</p>
            <p class="mt-1 truncate font-mono text-[10px] tracking-[0.3em] text-muted uppercase">Spawner</p>
          </div>
        </NuxtLink>
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu :collapsed="collapsed" :items="navigation" orientation="vertical" tooltip popover />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="secondary"
          orientation="vertical"
          tooltip
          class="mt-auto"
        />
      </template>

      <template #footer="{ collapsed }">
        <div class="flex w-full items-center gap-1" :class="collapsed ? 'flex-col' : ''">
          <UTooltip :text="live ? 'Tempo real conectado' : 'Tempo real desconectado: usando atualização periódica'">
            <span class="flex items-center gap-2 px-2 font-mono text-[10px] tracking-widest uppercase" :class="live ? 'text-primary' : 'text-dimmed'">
              <span class="size-2" :class="live ? 'bg-primary neon-dot' : 'bg-neutral-600'" />
              <span v-if="!collapsed">{{ live ? 'ao vivo' : 'offline' }}</span>
            </span>
          </UTooltip>
          <UTooltip v-if="!session?.bypassed" text="Sair">
            <UButton
              icon="i-nucleo-exit-door"
              color="neutral"
              variant="ghost"
              aria-label="Sair"
              :class="collapsed ? '' : 'ms-auto'"
              @click="logout"
            />
          </UTooltip>
        </div>
      </template>
    </UDashboardSidebar>

    <slot />
  </UDashboardGroup>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const { session, logout } = useAuth()
const { connected: live } = useRealtime()
const sidebarOpen = ref(false)
const route = useRoute()

watch(() => route.fullPath, () => {
  sidebarOpen.value = false
})

const navigation = computed<NavigationMenuItem[]>(() => [
  { label: 'Visão geral', icon: 'i-nucleo-grid-layout', to: '/', exact: true },
  { label: 'Instâncias', icon: 'i-nucleo-robot', to: '/instances' },
  { label: 'Repositórios', icon: 'i-nucleo-code-branch', to: '/repositories' },
  { label: 'Logs', icon: 'i-nucleo-scroll', to: '/logs' }
])

const secondary: NavigationMenuItem[] = [
  { label: 'Configurações', icon: 'i-nucleo-gear', to: '/settings' },
  { label: 'GitHub', icon: 'i-simple-icons-github', to: 'https://github.com/sergiooak/deadbyte-bot', target: '_blank' }
]
</script>
