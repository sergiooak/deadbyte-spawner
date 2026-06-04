<template>
  <UCard>
    <div class="flex items-start justify-between gap-3">
      <div>
        <h2 class="font-semibold">{{ repository.name }}</h2>
        <p class="text-sm text-gray-500">{{ repository.slug }}</p>
        <p class="mt-2 truncate text-xs text-gray-500">{{ repository.repositoryUrl }}</p>
      </div>
      <div class="flex gap-1">
        <UButton icon="i-lucide-trash-2" color="error" variant="ghost" :loading="deleting"
          @click="showDeleteModal = true" />
        <UButton icon="i-lucide-arrow-right" color="neutral" variant="ghost" :to="`/repositories/${repository.slug}`" />
      </div>
    </div>

    <UModal v-model:open="showDeleteModal" title="Delete repository" description="This action cannot be undone.">
      <template #body>
        <p class="text-sm text-gray-500">
          Are you sure you want to delete <span class="font-semibold text-gray-900 dark:text-white">{{ repository.name
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
  </UCard>
</template>

<script setup lang="ts">
const props = defineProps<{ repository: { name: string; slug: string; repositoryUrl: string } }>()
const emit = defineEmits<{ deleted: [] }>()
const toast = useToast()

const deleting = ref(false)
const showDeleteModal = ref(false)

async function deleteRepository() {
  deleting.value = true
  try {
    await $fetch(`/api/repositories/${props.repository.slug}`, { method: 'DELETE' })
    emit('deleted')
  } catch (err: unknown) {
    const message = (err as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Failed to delete repository.'
    toast.add({ title: 'Error', description: message, color: 'error' })
  } finally {
    deleting.value = false
    showDeleteModal.value = false
  }
}
</script>
