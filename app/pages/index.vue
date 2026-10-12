<template>
  <UDashboardPanel id="home">
    <template #header>
      <UDashboardNavbar title="Visão geral" :ui="{ right: 'gap-2' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton icon="i-nucleo-plus" @click="createOpen = true">Nova instância</UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UAlert
        v-if="session?.bypassed"
        color="warning"
        variant="subtle"
        icon="i-nucleo-shield-alert"
        title="Painel sem senha"
        description="DEADBYTE_ADMIN_PASSWORD não está definida. Isso só é permitido em desenvolvimento."
      />

      <UPageGrid class="gap-3 lg:grid-cols-4">
        <StatCard label="Online" :value="counts.online" highlight icon="i-nucleo-wifi" :hint="`de ${instances?.length ?? 0}`" to="/instances" />
        <StatCard label="Aguardando QR" :value="counts.waitingQr" icon="i-nucleo-qrcode" to="/instances" />
        <StatCard label="Com problema" :value="counts.problems" icon="i-nucleo-triangle-warning" to="/instances" />
        <StatCard label="Repositórios" :value="repositories?.length ?? 0" icon="i-nucleo-code-branch" to="/repositories" />
      </UPageGrid>

      <UPageCard v-if="!repositories?.length" variant="subtle" class="overflow-hidden">
        <div class="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div class="space-y-4">
            <div>
              <p class="text-lg font-semibold text-highlighted">Bem-vindo ao DeadByte 👋</p>
              <p class="text-sm text-muted">Três passos para colocar o bot no ar:</p>
            </div>
            <ol class="space-y-3">
              <li v-for="(step, index) in onboarding" :key="step.title" class="flex gap-3">
                <span class="grid size-6 shrink-0 place-items-center bg-primary/10 text-xs font-semibold text-primary ring ring-inset ring-primary/25">{{ index + 1 }}</span>
                <div>
                  <p class="text-sm font-medium text-highlighted">{{ step.title }}</p>
                  <p class="text-sm text-muted">{{ step.description }}</p>
                </div>
              </li>
            </ol>
          </div>
          <UButton to="/repositories?new=1" size="lg" icon="i-nucleo-code-branch">Cadastrar repositório</UButton>
        </div>
      </UPageCard>

      <section class="space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="font-pixel text-lg text-highlighted">Instâncias</h2>
          <UButton to="/instances" color="neutral" variant="link" trailing-icon="i-nucleo-arrow-right" size="sm">Ver todas</UButton>
        </div>

        <BrandIllustration v-if="!instances?.length" name="empty-instances" />
        <UEmpty
          v-if="!instances?.length"
          title="Nenhuma instância"
          description="Crie uma instância para conectar um número de WhatsApp."
          :actions="[{ label: 'Nova instância', icon: 'i-nucleo-plus', onClick: () => { createOpen = true } }]"
          variant="subtle"
        />

        <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <InstanceCard v-for="instance in instances" :key="instance.slug" :instance="instance" @changed="refreshInstances" />
        </div>
      </section>

      <InstanceCreateModal v-model:open="createOpen" />
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import type { Instance, Repository } from '~/types'

useHead({ title: 'Visão geral · DeadByte' })

const { session } = useAuth()
const createOpen = ref(false)

const { data: instances, refresh: refreshInstances } = await useApi<Instance[]>('/api/instances')
const { data: repositories } = await useApi<Repository[]>('/api/repositories')

const { connected: live } = useRealtime({
  onMessage(message) {
    if (message.type === 'instance.status') void refreshInstances()
  }
})
usePolling(refreshInstances, 5000, () => !live.value)

const counts = computed(() => {
  const list = instances.value ?? []
  return {
    online: list.filter((item) => item.status === 'ready').length,
    waitingQr: list.filter((item) => item.status === 'waiting_qr').length,
    problems: list.filter((item) => ['error', 'crashed', 'disconnected'].includes(item.status)).length
  }
})

const onboarding = [
  { title: 'Cadastre o repositório do bot', description: 'O spawner clona, instala e lê os comandos do manifesto.' },
  { title: 'Crie uma instância', description: 'Uma instância por número de WhatsApp.' },
  { title: 'Escaneie o QR', description: 'Abra a instância e pareie pelo WhatsApp → Aparelhos conectados.' }
]
</script>
