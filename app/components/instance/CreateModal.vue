<template>
  <UModal v-model:open="open" title="Nova instância" description="Cada instância é um número de WhatsApp rodando o bot." :ui="{ footer: 'justify-end' }">
    <template #body>
      <UEmpty
        v-if="!repositories?.length"
        icon="i-nucleo-code-branch"
        title="Cadastre um repositório primeiro"
        description="A instância roda o código de um repositório sincronizado."
        :actions="[{ label: 'Novo repositório', to: '/repositories?new=1', icon: 'i-nucleo-plus' }]"
        variant="naked"
      />
      <UForm v-else id="create-instance" :schema="schema" :state="state" class="space-y-4" @submit="submit">
        <UFormField label="Nome" name="name" required>
          <UInput v-model="state.name" placeholder="Ex.: Nitro" class="w-full" autofocus />
        </UFormField>
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField label="Slug" name="slug" help="Usado na URL e nas pastas." required>
            <UInput v-model="state.slug" class="w-full font-mono" @update:model-value="slugTouched = true" />
          </UFormField>
          <UFormField label="Client ID" name="clientId" help="ID da sessão do WhatsApp." required>
            <UInput v-model="state.clientId" class="w-full font-mono" @update:model-value="clientTouched = true" />
          </UFormField>
        </div>
        <UFormField label="Repositório" name="repositorySlug" required>
          <USelect v-model="state.repositorySlug" :items="repositoryItems" class="w-full" />
        </UFormField>
        <UFormField label="Branch" name="branch" help="Vazio usa a branch padrão do repositório.">
          <UInput v-model="state.branch" placeholder="main" class="w-full font-mono" />
        </UFormField>
        <USwitch v-model="state.start" label="Iniciar agora" description="Sobe o bot e mostra o QR para parear." />
      </UForm>
    </template>

    <template #footer>
      <UButton color="neutral" variant="ghost" @click="open = false">Cancelar</UButton>
      <UButton v-if="repositories?.length" type="submit" form="create-instance" icon="i-nucleo-plus" :loading="loading">Criar instância</UButton>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { z } from 'zod'
import type { Repository } from '~/types'

const open = defineModel<boolean>('open', { default: false })

const { data: repositories } = await useApi<Repository[]>('/api/repositories')
const repositoryItems = computed(() => (repositories.value ?? []).map((repo) => ({ label: repo.name, value: repo.slug })))

const slugRule = z.string().min(1, 'Obrigatório.').regex(/^[a-z0-9][a-z0-9-]*$/, 'Só letras minúsculas, números e hífen.')
const schema = z.object({
  name: z.string().min(1, 'Obrigatório.'),
  slug: slugRule,
  clientId: slugRule,
  repositorySlug: z.string().min(1, 'Escolha um repositório.'),
  branch: z.string().optional(),
  start: z.boolean()
})

const initial = () => ({ name: '', slug: '', clientId: '', repositorySlug: repositories.value?.[0]?.slug ?? '', branch: '', start: true })
const state = reactive(initial())
const slugTouched = ref(false)
const clientTouched = ref(false)
const loading = ref(false)

watch(open, (value) => {
  if (value) {
    Object.assign(state, initial())
    slugTouched.value = false
    clientTouched.value = false
  }
})

watch(() => state.name, (name) => {
  if (!slugTouched.value) state.slug = toSlug(name)
  if (!clientTouched.value) state.clientId = toSlug(name)
})

async function submit() {
  loading.value = true
  const created = await withToast(
    () => apiRequest('/api/instances', { method: 'POST', body: { ...state, branch: state.branch || undefined } }),
    { success: state.start ? 'Instância criada e iniciando' : 'Instância criada', error: 'Não foi possível criar' }
  )
  loading.value = false
  if (created) {
    open.value = false
    await navigateTo(`/instances/${state.slug}`)
  }
}
</script>
