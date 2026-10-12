<template>
  <div class="grid min-h-dvh bg-default lg:grid-cols-[1.2fr_1fr]">
    <!-- Hero do brandbook (public/brand/login-hero.png, versão leve em web/), só em telas grandes -->
    <div class="relative hidden overflow-hidden border-r border-default lg:block">
      <img src="/brand/web/login-hero.webp" alt="" class="absolute inset-0 size-full object-cover object-right" />
      <div aria-hidden="true" class="absolute inset-0 bg-linear-to-r from-transparent via-transparent to-black" />
      <div aria-hidden="true" class="scanlines absolute inset-0" />
    </div>

    <div class="relative flex items-center justify-center overflow-hidden px-4 py-12">
      <div aria-hidden="true" class="grid-backdrop pointer-events-none absolute inset-0" />
      <div aria-hidden="true" class="scanlines pointer-events-none absolute inset-0" />
      <div class="relative w-full max-w-sm">
        <slot />
      </div>
    </div>
  </div>
</template>
