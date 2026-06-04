<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-3">
      <h1 class="text-xl font-semibold">Repositories</h1>
      <UButton to="/repositories/new" icon="i-lucide-plus">New repository</UButton>
    </div>
    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <RepositoryCard v-for="repository in repositories ?? []" :key="repository.slug" :repository="repository"
        @deleted="refresh" />
    </div>
  </div>
</template>

<script setup lang="ts">
type Repository = { slug: string; name: string; repositoryUrl: string }
const { data: repositories, refresh } = await useFetch<Repository[]>('/api/repositories')
</script>
