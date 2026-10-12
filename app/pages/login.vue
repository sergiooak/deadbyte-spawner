<template>
  <div class="space-y-6">
    <div class="flex flex-col items-center gap-3 text-center">
      <AppLogo class="size-14" />
      <div>
        <h1><img src="/brand/web/wordmark.webp" alt="DeadByte" width="800" height="200" class="mx-auto h-auto w-56" /></h1>
        <p class="mt-2 font-mono text-xs tracking-[0.3em] text-muted uppercase">Spawner · acesso restrito</p>
      </div>
    </div>

    <UCard :ui="{ body: 'p-5 sm:p-6' }" class="bg-black ring-primary/40 shadow-[0_0_40px_-12px_var(--ui-primary)]">
      <UAlert
        v-if="session?.problem"
        color="warning"
        variant="subtle"
        icon="i-nucleo-lock"
        title="Painel bloqueado"
        :description="`${session.problem} Configure a variável de ambiente na Coolify e reinicie.`"
        class="mb-5"
      />

      <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField label="Senha de administrador" name="password">
          <UInput
            v-model="state.password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="••••••••••••••••"
            icon="i-nucleo-key"
            autocomplete="current-password"
            autofocus
            size="lg"
            class="w-full"
            :disabled="!!session?.problem"
            :ui="{ trailing: 'pe-1' }"
          >
            <template #trailing>
              <UButton
                color="neutral"
                variant="link"
                size="sm"
                :icon="showPassword ? 'i-nucleo-eye-slash' : 'i-nucleo-eye'"
                :aria-label="showPassword ? 'Esconder senha' : 'Mostrar senha'"
                @click="showPassword = !showPassword"
              />
            </template>
          </UInput>
        </UFormField>

        <UAlert v-if="error" color="error" variant="soft" icon="i-nucleo-circle-xmark" :description="error" />

        <UButton type="submit" block size="lg" :loading="loading" :disabled="!!session?.problem" trailing-icon="i-nucleo-arrow-right">
          Entrar
        </UButton>
      </UForm>
    </UCard>

    <p class="text-center font-mono text-[11px] text-dimmed">sessão criptografada · expira em 7 dias</p>
  </div>
</template>

<script setup lang="ts">
import { z } from 'zod'

definePageMeta({ layout: 'auth' })
useHead({ title: 'Entrar · DeadByte' })

const { session, login } = useAuth()
const route = useRoute()

const schema = z.object({
  password: z.string().min(1, 'Digite a senha.')
})

const state = reactive({ password: '' })
const loading = ref(false)
const error = ref('')
const showPassword = ref(false)

async function onSubmit() {
  loading.value = true
  error.value = ''
  try {
    await login(state.password)
    await navigateTo(typeof route.query.redirect === 'string' ? route.query.redirect : '/')
  } catch (err) {
    error.value = errorMessage(err, 'Não foi possível entrar.')
    state.password = ''
  } finally {
    loading.value = false
  }
}
</script>
