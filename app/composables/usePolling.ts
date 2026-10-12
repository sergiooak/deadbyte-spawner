/**
 * Chama `callback` a cada `intervalMs` enquanto o componente está montado e a aba visível.
 * `enabled` permite pausar o polling (ex.: auto-refresh desligado).
 */
export function usePolling(callback: () => unknown, intervalMs: number, enabled: Ref<boolean> | (() => boolean) = () => true) {
  let timer: ReturnType<typeof setInterval> | undefined
  const isEnabled = () => (typeof enabled === 'function' ? enabled() : enabled.value)

  function tick() {
    if (document.visibilityState === 'visible' && isEnabled()) {
      void callback()
    }
  }

  onMounted(() => {
    timer = setInterval(tick, intervalMs)
    document.addEventListener('visibilitychange', tick)
  })

  onBeforeUnmount(() => {
    clearInterval(timer)
    document.removeEventListener('visibilitychange', tick)
  })
}
