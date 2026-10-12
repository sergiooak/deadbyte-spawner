<template>
  <UDashboardPanel id="repositories">
    <template #header>
      <UDashboardNavbar title="Repositórios">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton icon="i-nucleo-code-fork" @click="createOpen = true">Adicionar fork</UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <BrandIllustration v-if="!repositories?.length" name="empty-repositories" />
      <UEmpty
        v-if="!repositories?.length"
        title="Nenhum repositório"
        description="Cadastre o repositório git do bot. O spawner clona, instala, builda e importa os comandos."
        :actions="[{ label: 'Novo repositório', icon: 'i-nucleo-plus', onClick: () => { createOpen = true } }]"
        variant="subtle"
      />

      <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <UPageCard
          v-for="repository in repositories"
          :key="repository.slug"
          :to="`/repositories/${repository.slug}`"
          :variant="repository.official ? 'outline' : 'subtle'"
          icon="i-simple-icons-github"
          :title="repository.name"
          :description="repoLabel(repository.repositoryUrl)"
          :ui="{ description: 'font-mono text-xs truncate', leading: repository.official ? 'text-primary' : '' }"
          :class="repository.official ? 'neon-ring bg-primary/5' : ''"
        >
          <UBadge v-if="repository.official" color="primary" variant="solid" size="sm" icon="i-nucleo-shield-check" class="absolute end-3 top-3">oficial</UBadge>
          <div class="flex flex-wrap items-center gap-2 text-xs text-muted">
            <UBadge color="neutral" variant="soft" icon="i-nucleo-code-branch" size="sm">{{ repository.defaultBranch }}</UBadge>
            <UBadge v-if="!repository.official" color="neutral" variant="soft" icon="i-nucleo-code-fork" size="sm">fork</UBadge>
            <UBadge color="neutral" variant="soft" icon="i-nucleo-robot" size="sm">
              {{ instanceCount(repository.slug) }} {{ instanceCount(repository.slug) === 1 ? 'instância' : 'instâncias' }}
            </UBadge>
            <span class="ms-auto">atualizado {{ timeAgo(repository.updatedAt) }}</span>
          </div>
        </UPageCard>
      </div>

      <RepositoryCreateModal v-model:open="createOpen" />
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import type { Instance, Repository } from '~/types'

useHead({ title: 'Repositórios · DeadByte' })

const route = useRoute()
const createOpen = ref(route.query.new === '1')

const { data: repositories } = await useApi<Repository[]>('/api/repositories')
const { data: instances } = await useApi<Instance[]>('/api/instances')

function instanceCount(slug: string) {
  return (instances.value ?? []).filter((item) => item.repositorySlug === slug).length
}
</script>
