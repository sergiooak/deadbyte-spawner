<template>
  <div class="grid min-h-dvh bg-default lg:grid-cols-[1.2fr_1fr]">
    <!-- Hero do brandbook (public/brand/login-hero.png, versão leve em web/), só em telas grandes -->
    <div class="relative hidden overflow-hidden border-r border-default lg:block">
      <!-- Imagem inteira na altura, presa à direita; o que sobrar à esquerda some no fundo pelo fade -->
      <div class="absolute inset-y-0 right-0 aspect-[8/5] h-full">
        <img src="/brand/web/login-hero.webp" alt="" class="size-full object-cover" />
        <div aria-hidden="true" class="absolute inset-0 bg-linear-to-r from-(--ui-bg) via-(--ui-bg)/40 via-25% to-transparent to-60%" />
      </div>
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
