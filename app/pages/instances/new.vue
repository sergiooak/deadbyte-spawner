<template>
  <div class="max-w-2xl space-y-4">
    <h1 class="text-xl font-semibold">New Instance</h1>
    <UForm :state="state" class="space-y-3" @submit="submit">
      <UFormField label="Repository">
        <USelect v-model="state.repositorySlug" :items="repositoryItems" />
      </UFormField>
      <UFormField label="Name">
        <UInput v-model="state.name" />
      </UFormField>
      <UFormField label="Slug">
        <UInput v-model="state.slug" />
      </UFormField>
      <UFormField label="Client ID">
        <UInput v-model="state.clientId" />
      </UFormField>
      <UFormField label="Branch">
        <UInput v-model="state.branch" />
      </UFormField>
      <UButton type="submit" icon="i-lucide-save" :loading="loading">Create</UButton>
    </UForm>
  </div>
</template>

<script setup lang="ts">
type Repository = { slug: string; name: string }
const { data: repositories } = await useFetch<Repository[]>('/api/repositories')
const repositoryItems = computed(() => (repositories.value ?? []).map((repo) => ({ label: repo.name, value: repo.slug })))
const loading = ref(false)
const state = reactive({
  repositorySlug: '',
  name: 'Nitro',
  slug: 'nitro',
  clientId: 'nitro',
  branch: 'main'
})

function toSlug(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

let slugEditedManually = false

watch(() => state.name, (name) => {
  if (!slugEditedManually) {
    state.slug = toSlug(name)
    state.clientId = toSlug(name)
  }
})

watch(() => state.slug, () => {
  slugEditedManually = true
})

watchEffect(() => {
  if (!state.repositorySlug && repositories.value?.[0]) {
    state.repositorySlug = repositories.value[0].slug
  }
})

async function submit() {
  loading.value = true
  try {
    await $fetch('/api/instances', { method: 'POST', body: state })
    await navigateTo(`/instances/${state.slug}`)
  } finally {
    loading.value = false
  }
}
</script>
