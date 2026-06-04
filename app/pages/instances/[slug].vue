<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold">{{ instance?.name }}</h1>
        <div class="mt-1 flex items-center gap-2">
          <InstanceStatusBadge :status="instance?.status" />
          <span class="text-sm text-gray-500">{{ instance?.clientId }}</span>
        </div>
      </div>
      <div class="flex gap-2">
        <InstanceActions v-if="instance" :slug="slug" @refresh="refreshAll" />
        <UButton icon="i-lucide-trash-2" color="error" variant="soft" :loading="deleting"
          @click="showDeleteModal = true">Delete</UButton>
      </div>
    </div>
    <div class="grid gap-5 xl:grid-cols-[360px_1fr]">
      <InstanceQrPanel :slug="slug" />
      <UCard>
        <template #header>
          <h2 class="text-base font-semibold">Commands</h2>
        </template>
        <InstanceCommandSettings :commands="commands ?? []" />
      </UCard>
    </div>
    <UTabs :items="tabs">
      <template #logs>
        <LogProcessViewer :logs="logs ?? []" />
      </template>
      <template #events>
        <LogRuntimeEventList :events="events ?? []" />
      </template>
    </UTabs>

    <UModal v-model:open="showDeleteModal" title="Delete instance" description="This action cannot be undone.">
      <template #body>
        <p class="text-sm text-gray-500">
          Are you sure you want to delete <span class="font-semibold text-gray-900 dark:text-white">{{ instance?.name
            }}</span>?
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="showDeleteModal = false">Cancel</UButton>
          <UButton color="error" :loading="deleting" @click="deleteInstance">Delete</UButton>
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
const deleting = ref(false)
const showDeleteModal = ref(false)
const tabs = [
  { label: 'Logs', slot: 'logs' },
  { label: 'Events', slot: 'events' }
]
const { data: instance, refresh: refreshInstance } = await useFetch<Record<string, unknown>>(() => `/api/instances/${slug.value}`)
const { data: commands, refresh: refreshCommands } = await useFetch<Array<{ commandId: string; commandKey: string; name: string; group: string; enabled: boolean }>>(
  () => `/api/instances/${slug.value}/commands`
)
const { data: logs, refresh: refreshLogs } = await useFetch<Array<{ id: number; stream: string; line: string }>>(() => `/api/instances/${slug.value}/logs`)
const { data: events, refresh: refreshEvents } = await useFetch<Array<{ id: number; eventName: string; level: string; message?: string | null }>>(
  () => `/api/instances/${slug.value}/events`
)

async function refreshAll() {
  await Promise.all([refreshInstance(), refreshCommands(), refreshLogs(), refreshEvents()])
}

async function deleteInstance() {
  deleting.value = true
  try {
    await $fetch(`/api/instances/${slug.value}`, { method: 'DELETE' })
    router.push('/instances')
  } catch (err: unknown) {
    const message = (err as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Failed to delete instance.'
    toast.add({ title: 'Error', description: message, color: 'error' })
  } finally {
    deleting.value = false
    showDeleteModal.value = false
  }
}
</script>
