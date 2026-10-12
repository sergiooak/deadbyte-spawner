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
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <NuxtLink to="/" class="flex min-w-0 items-center gap-2.5" :class="collapsed ? 'mx-auto' : 'px-1'">
          <AppLogo class="size-8 shrink-0" />
          <div v-if="!collapsed" class="min-w-0 leading-tight">
            <p class="truncate text-sm font-semibold text-highlighted">DeadByte</p>
            <p class="truncate text-xs text-muted">Spawner</p>
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
          <UTooltip v-if="!session?.bypassed" text="Sair">
            <UButton
              icon="i-lucide-log-out"
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
const sidebarOpen = ref(false)
const route = useRoute()

watch(() => route.fullPath, () => {
  sidebarOpen.value = false
})

const navigation = computed<NavigationMenuItem[]>(() => [
  { label: 'Visão geral', icon: 'i-lucide-layout-dashboard', to: '/', exact: true },
  { label: 'Instâncias', icon: 'i-lucide-bot', to: '/instances' },
  { label: 'Repositórios', icon: 'i-lucide-git-branch', to: '/repositories' },
  { label: 'Logs', icon: 'i-lucide-scroll-text', to: '/logs' }
])

const secondary: NavigationMenuItem[] = [
  { label: 'Configurações', icon: 'i-lucide-settings', to: '/settings' },
  { label: 'GitHub', icon: 'i-simple-icons-github', to: 'https://github.com/sergiooak/deadbyte-bot', target: '_blank' }
]
</script>
