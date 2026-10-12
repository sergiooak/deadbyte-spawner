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

export function errorMessage(error: unknown, fallback = 'Algo deu errado.'): string {
  const data = (error as { data?: { statusMessage?: string; message?: string; data?: { message?: string } } })?.data
  return data?.data?.message ?? data?.statusMessage ?? data?.message ?? (error instanceof Error ? error.message : fallback)
}

/** Executa uma ação mostrando toast de sucesso/erro. Retorna o resultado ou undefined em caso de erro. */
export async function withToast<T>(task: () => Promise<T>, messages: { success?: string; error?: string } = {}): Promise<T | undefined> {
  const toast = useToast()
  try {
    const result = await task()
    if (messages.success) {
      toast.add({ title: messages.success, color: 'success', icon: 'i-lucide-circle-check' })
    }
    return result
  } catch (error) {
    toast.add({
      title: messages.error ?? 'Falhou',
      description: errorMessage(error),
      color: 'error',
      icon: 'i-lucide-circle-x'
    })
    return undefined
  }
}
