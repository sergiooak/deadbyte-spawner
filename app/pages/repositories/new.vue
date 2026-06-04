<template>
  <div class="max-w-2xl space-y-4">
    <h1 class="text-xl font-semibold">New Repository</h1>
    <UForm :state="state" class="space-y-3" @submit="submit">
      <UFormField label="Name">
        <UInput v-model="state.name" />
      </UFormField>
      <UFormField label="Slug">
        <UInput v-model="state.slug" />
      </UFormField>
      <UFormField label="Repository URL">
        <UInput v-model="state.repositoryUrl" />
      </UFormField>
      <UFormField label="Default branch">
        <UInput v-model="state.defaultBranch" />
      </UFormField>
      <UButton type="submit" icon="i-lucide-save" :loading="loading">Create</UButton>
    </UForm>
  </div>
</template>

<script setup lang="ts">
const loading = ref(false)
const state = reactive({
  name: 'DeadByte Bot',
  slug: 'deadbyte-bot',
  repositoryUrl: 'https://github.com/sergiooak/deadbyte-bot.git',
  defaultBranch: 'main'
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
  }
})

watch(() => state.slug, () => {
  slugEditedManually = true
})

async function submit() {
  loading.value = true
  try {
    await $fetch('/api/repositories', { method: 'POST', body: state })
    await navigateTo(`/repositories/${state.slug}`)
  } finally {
    loading.value = false
  }
}
</script>
