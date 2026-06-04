<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold">{{ repository?.name }}</h1>
        <p class="text-sm text-gray-500">{{ repository?.repositoryUrl }}</p>
      </div>
      <div class="flex gap-2">
        <UButton icon="i-lucide-refresh-cw" :loading="syncing" @click="sync">Sync manifest</UButton>
        <UButton icon="i-lucide-trash-2" color="error" variant="soft" :loading="deleting" @click="confirmDelete">Delete
        </UButton>
      </div>
    </div>
    <RepositoryManifestSummary :commands-count="commands?.length" />
    <RepositoryCommandTable :commands="commands ?? []" />

    <UModal v-model:open="showDeleteModal" title="Delete repository" description="This action cannot be undone.">
      <template #body>
        <p class="text-sm text-gray-500">
          Are you sure you want to delete <span class="font-semibold text-gray-900 dark:text-white">{{ repository?.name
            }}</span>?
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="showDeleteModal = false">Cancel</UButton>
          <UButton color="error" :loading="deleting" @click="deleteRepository">Delete</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const toast = useToast()
const slug = computed(() => String(route.params.slug))
const syncing = ref(false)
const deleting = ref(false)
const showDeleteModal = ref(false)
const { data: repository, refresh: refreshRepository } = await useFetch<Record<string, string>>(() => `/api/repositories/${slug.value}`)
const { data: commands, refresh: refreshCommands } = await useFetch<Array<Record<string, unknown>>>(() => `/api/repositories/${slug.value}/commands`)

async function sync() {
  syncing.value = true
  try {
    await $fetch(`/api/repositories/${slug.value}/sync-manifest`, { method: 'POST' })
    await Promise.all([refreshRepository(), refreshCommands()])
  } finally {
    syncing.value = false
  }
}

function confirmDelete() {
  showDeleteModal.value = true
}

async function deleteRepository() {
  deleting.value = true
  try {
    await $fetch(`/api/repositories/${slug.value}`, { method: 'DELETE' })
    router.push('/repositories')
  } catch (err: unknown) {
    const message = (err as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Failed to delete repository.'
    toast.add({ title: 'Error', description: message, color: 'error' })
  } finally {
    deleting.value = false
    showDeleteModal.value = false
  }
}
</script>
