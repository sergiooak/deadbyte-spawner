import type { UseFetchOptions } from 'nuxt/app'

/** useFetch que redireciona para o login quando a sessão expira. */
export function useApi<T>(url: string | (() => string), options: UseFetchOptions<T> = {}) {
  return useFetch(url, {
    ...options,
    $fetch: useNuxtApp().$api as typeof $fetch
  })
}

/** Chamada imperativa (POST/PATCH/DELETE) com o mesmo tratamento de 401. */
export function apiRequest<T = unknown>(url: string, options: Parameters<typeof $fetch>[1] = {}) {
  return (useNuxtApp().$api as typeof $fetch)<T>(url, options)
}

type ErrorBody = { statusMessage?: string; message?: string; why?: string; fix?: string; data?: { message?: string; why?: string; fix?: string } }

/** Mensagem legível de um erro da API, incluindo o porquê e a correção dos erros estruturados (evlog). */
export function errorMessage(error: unknown, fallback = 'Algo deu errado.'): string {
  const data = (error as { data?: ErrorBody })?.data
  const base = data?.data?.message ?? data?.statusMessage ?? data?.message ?? (error instanceof Error ? error.message : fallback)
  const why = data?.why ?? data?.data?.why
  const fix = data?.fix ?? data?.data?.fix
  return [base, why, fix ? `Como resolver: ${fix}` : undefined].filter(Boolean).join(' · ')
}

/** Executa uma ação mostrando toast de sucesso/erro. Retorna o resultado ou undefined em caso de erro. */
export async function withToast<T>(task: () => Promise<T>, messages: { success?: string; error?: string } = {}): Promise<T | undefined> {
  const toast = useToast()
  try {
    const result = await task()
    if (messages.success) {
      toast.add({ title: messages.success, color: 'success', icon: 'i-nucleo-circle-check' })
    }
    return result
  } catch (error) {
    toast.add({
      title: messages.error ?? 'Falhou',
      description: errorMessage(error),
      color: 'error',
      icon: 'i-nucleo-circle-xmark'
    })
    return undefined
  }
}
