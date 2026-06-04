<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-3">
      <h1 class="text-xl font-semibold">Instances</h1>
      <UButton to="/instances/new" icon="i-lucide-plus">New instance</UButton>
    </div>
    <div class="overflow-hidden rounded border border-gray-200 dark:border-gray-800">
      <table class="w-full text-left text-sm">
        <thead class="bg-gray-100 dark:bg-gray-900">
          <tr>
            <th class="p-3">Name</th>
            <th class="p-3">Status</th>
            <th class="p-3">Client</th>
            <th class="p-3">Branch</th>
            <th class="p-3">Port</th>
            <th class="p-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="instance in instances ?? []" :key="instance.slug"
            class="border-t border-gray-100 dark:border-gray-800">
            <td class="p-3 font-medium">{{ instance.name }}</td>
            <td class="p-3">
              <InstanceStatusBadge :status="instance.status" />
            </td>
            <td class="p-3">{{ instance.clientId }}</td>
            <td class="p-3">{{ instance.branch }}</td>
            <td class="p-3">{{ instance.internalPort }}</td>
            <td class="p-3 text-right">
              <div class="flex justify-end gap-1">
                <UButton icon="i-lucide-trash-2" color="error" variant="ghost" @click="toDelete = instance" />
                <UButton :to="`/instances/${instance.slug}`" icon="i-lucide-arrow-right" variant="ghost" />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <UModal v-model:open="showDeleteModal" title="Delete instance" description="This action cannot be undone.">
      <template #body>
        <p class="text-sm text-gray-500">
          Are you sure you want to delete <span class="font-semibold text-gray-900 dark:text-white">{{ toDelete?.name
            }}</span>?
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="toDelete = null">Cancel</UButton>
          <UButton color="error" :loading="deleting" @click="deleteInstance">Delete</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
type Instance = { slug: string; name: string; status: string; clientId: string; branch: string; internalPort?: number }
const toast = useToast()
const { data: instances, refresh } = await useFetch<Instance[]>('/api/instances')
const toDelete = ref<Instance | null>(null)
const showDeleteModal = computed({
  get: () => toDelete.value !== null,
  set: (v) => { if (!v) toDelete.value = null }
})
const deleting = ref(false)

async function deleteInstance() {
  if (!toDelete.value) return
  deleting.value = true
  try {
    await $fetch(`/api/instances/${toDelete.value.slug}`, { method: 'DELETE' })
    toDelete.value = null
    await refresh()
  } catch (err: unknown) {
    const message = (err as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Failed to delete instance.'
    toast.add({ title: 'Error', description: message, color: 'error' })
  } finally {
    deleting.value = false
  }
}
</script>
