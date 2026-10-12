<template>
  <div class="relative flex min-h-dvh items-center justify-center overflow-hidden bg-default px-4 py-12">
    <div
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--ui-color-primary-500)/0.18,transparent_60%)]"
    />
    <div
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--ui-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--ui-border)_1px,transparent_1px)] bg-size-[48px_48px] mask-[radial-gradient(ellipse_at_center,black_20%,transparent_70%)] opacity-60"
    />
    <div class="relative w-full max-w-sm">
      <slot />
    </div>
  </div>
</template>
