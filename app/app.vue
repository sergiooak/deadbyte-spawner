<template>
  <UApp :toaster="{ position: 'bottom-right' }">
    <NuxtLoadingIndicator color="var(--ui-primary)" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<script setup lang="ts">
// Garante dark mode mesmo se o navegador tiver outra preferência salva.
useColorMode().preference = 'dark'
</script>
