<template>
  <div class="space-y-4">
    <h1 class="text-xl font-semibold">Logs</h1>
    <USelect v-model="selected" :items="items" placeholder="Select instance" class="max-w-sm" />
    <LogProcessViewer :logs="logs ?? []" />
  </div>
</template>

<script setup lang="ts">
type Instance = { slug: string; name: string }
const { data: instances } = await useFetch<Instance[]>('/api/instances')
const selected = ref('')
const items = computed(() => (instances.value ?? []).map((item) => ({ label: item.name, value: item.slug })))
watchEffect(() => {
  if (!selected.value && instances.value?.[0]) selected.value = instances.value[0].slug
})
const { data: logs } = await useFetch<Array<{ id: number; stream: string; line: string }>>(() =>
  selected.value ? `/api/instances/${selected.value}/logs` : '/api/instances/_/logs'
)
</script>
