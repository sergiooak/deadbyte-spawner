<template>
  <!-- Ilustrações em public/brand/ (prompts em brand/PROMPTS.md), servidas pelas cópias leves de brand/optimize.py -->
  <img :src="`/brand/web/${name}.webp`" :alt="alt" width="800" height="600" loading="lazy" class="pointer-events-none mx-auto h-auto w-full select-none" :class="sizeClass" />
</template>

<script setup lang="ts">
type IllustrationName = 'empty-instances' | 'empty-repositories' | 'bot-offline' | 'bot-crashed' | 'bot-connected'

withDefaults(defineProps<{ name: IllustrationName; alt?: string; sizeClass?: string }>(), { alt: '', sizeClass: 'max-w-64' })
</script>
