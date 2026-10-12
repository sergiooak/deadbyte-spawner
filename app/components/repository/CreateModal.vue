<template>
  <UModal v-model:open="open" title="Adicionar fork" description="Outro repositório git com o código do bot (um fork do oficial, por exemplo). Precisa ter o comando de manifesto." :ui="{ footer: 'justify-end' }">
    <template #body>
      <UForm id="create-repository" :schema="schema" :state="state" class="space-y-4" @submit="submit">
        <UFormField label="URL do git" name="repositoryUrl" required>
          <UInput v-model="state.repositoryUrl" icon="i-simple-icons-github" placeholder="https://github.com/voce/deadbyte-bot.git" class="w-full font-mono" autofocus @update:model-value="suggestName" />
        </UFormField>
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField label="Nome" name="name" required>
            <UInput v-model="state.name" class="w-full" />
          </UFormField>
          <UFormField label="Slug" name="slug" required>
            <UInput v-model="state.slug" class="w-full font-mono" @update:model-value="slugTouched = true" />
          </UFormField>
        </div>
        <UFormField label="Branch padrão" name="defaultBranch" required>
          <UInput v-model="state.defaultBranch" class="w-full font-mono" />
        </UFormField>
        <USwitch v-model="syncAfter" label="Sincronizar logo depois" description="Clona, instala, builda e importa os comandos (leva alguns minutos)." />
      </UForm>
    </template>

    <template #footer>
      <UButton color="neutral" variant="ghost" @click="open = false">Cancelar</UButton>
      <UButton type="submit" form="create-repository" icon="i-nucleo-plus" :loading="loading">Cadastrar</UButton>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { z } from 'zod'

const open = defineModel<boolean>('open', { default: false })

const schema = z.object({
  repositoryUrl: z.string().min(1, 'Obrigatório.'),
  name: z.string().min(1, 'Obrigatório.'),
  slug: z.string().min(1, 'Obrigatório.').regex(/^[a-z0-9][a-z0-9-]*$/, 'Só letras minúsculas, números e hífen.'),
  defaultBranch: z.string().min(1, 'Obrigatório.')
})

const initial = () => ({
  repositoryUrl: '',
  name: '',
  slug: '',
  defaultBranch: 'main'
})
const state = reactive(initial())
const slugTouched = ref(false)
const syncAfter = ref(true)
const loading = ref(false)

watch(open, (value) => {
  if (value) {
    Object.assign(state, initial())
    slugTouched.value = false
  }
})

// Sugere nome a partir da URL: github.com/fulano/deadbyte-bot → "fulano/deadbyte-bot".
function suggestName(url: string) {
  if (state.name) return
  const match = /github\.com[/:]([^/]+)\/([^/.]+)/.exec(url)
  if (match) state.name = `${match[1]}/${match[2]}`
}

watch(() => state.name, (name) => {
  if (!slugTouched.value) state.slug = toSlug(name)
})

async function submit() {
  loading.value = true
  const created = await withToast(() => apiRequest('/api/repositories', { method: 'POST', body: state }), {
    success: 'Repositório cadastrado',
    error: 'Não foi possível cadastrar'
  })
  loading.value = false
  if (created) {
    open.value = false
    await navigateTo({ path: `/repositories/${state.slug}`, query: syncAfter.value ? { sync: '1' } : undefined })
  }
}
</script>
