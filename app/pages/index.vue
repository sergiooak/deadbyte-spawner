<template>
  <div class="space-y-5">
    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <UCard v-for="item in cards" :key="item.label">
        <p class="text-sm text-gray-500">{{ item.label }}</p>
        <p class="mt-1 text-3xl font-semibold">{{ item.value }}</p>
      </UCard>
    </div>
    <section class="grid gap-5 xl:grid-cols-2">
      <div>
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-base font-semibold">Repositories</h2>
          <UButton to="/repositories/new" icon="i-lucide-plus" size="sm">New</UButton>
        </div>
        <div class="grid gap-3">
          <RepositoryCard v-for="repository in repositories ?? []" :key="repository.slug" :repository="repository" />
        </div>
      </div>
      <div>
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-base font-semibold">Instances</h2>
          <UButton to="/instances/new" icon="i-lucide-plus" size="sm">New</UButton>
        </div>
        <div class="overflow-hidden rounded border border-gray-200 dark:border-gray-800">
          <table class="w-full text-left text-sm">
            <tbody>
              <tr v-for="instance in instances ?? []" :key="instance.slug" class="border-b border-gray-100 dark:border-gray-800">
                <td class="p-3 font-medium">{{ instance.name }}</td>
                <td class="p-3"><InstanceStatusBadge :status="instance.status" /></td>
                <td class="p-3 text-right"><UButton :to="`/instances/${instance.slug}`" icon="i-lucide-arrow-right" variant="ghost" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
type Repository = { slug: string; name: string; repositoryUrl: string }
type Instance = { slug: string; name: string; status: string }

const { data: repositories } = await useFetch<Repository[]>('/api/repositories')
const { data: instances } = await useFetch<Instance[]>('/api/instances')

const cards = computed(() => {
  const list = instances.value ?? []
  return [
    { label: 'Repositories', value: repositories.value?.length ?? 0 },
    { label: 'Instances', value: list.length },
    { label: 'Running', value: list.filter((item) => item.status === 'ready').length },
    { label: 'Waiting QR', value: list.filter((item) => item.status === 'waiting_qr').length },
    { label: 'Errors', value: list.filter((item) => ['error', 'crashed'].includes(item.status)).length }
  ]
})
</script>
