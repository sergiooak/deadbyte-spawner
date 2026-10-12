<template>
  <UCard :ui="{ body: 'p-4 sm:p-4', footer: 'px-4 py-3 sm:px-4' }" class="group transition hover:ring-accented">
    <NuxtLink :to="`/instances/${instance.slug}`" class="flex items-start gap-3">
      <UAvatar :text="initials" size="lg" :ui="{ root: 'bg-primary/10 ring ring-inset ring-primary/20', fallback: 'text-primary font-semibold' }" />
      <div class="min-w-0 flex-1">
        <div class="flex items-start justify-between gap-2">
          <p class="truncate font-semibold text-highlighted group-hover:text-primary">{{ instance.name }}</p>
          <StatusBadge :status="instance.status" size="sm" />
        </div>
        <p class="truncate font-mono text-xs text-muted">{{ instance.slug }} · {{ instance.branch }}</p>
        <p class="mt-2 text-xs text-dimmed">
          <template v-if="instance.status === 'ready'">Online desde {{ timeAgo(instance.lastReadyAt) }}</template>
          <template v-else-if="instance.status === 'waiting_qr'">Escaneie o QR para conectar</template>
          <template v-else>Atualizado {{ timeAgo(instance.updatedAt) }}</template>
        </p>
      </div>
    </NuxtLink>
    <template #footer>
      <div class="flex items-center justify-between gap-2">
        <UTooltip :text="instance.autoStart ? 'Volta sozinha após reinício do servidor' : 'Não inicia sozinha'">
          <span class="flex items-center gap-1.5 text-xs text-muted">
            <UIcon :name="instance.autoStart ? 'i-nucleo-repeat' : 'i-nucleo-hand'" class="size-3.5" />
            {{ instance.autoStart ? 'Auto-start' : 'Manual' }}
          </span>
        </UTooltip>
        <InstanceActions :slug="instance.slug" :status="instance.status" size="xs" compact @changed="emit('changed')" />
      </div>
    </template>
  </UCard>
</template>

<script setup lang="ts">
import type { Instance } from '~/types'

const props = defineProps<{ instance: Instance }>()
const emit = defineEmits<{ changed: [] }>()

const initials = computed(() =>
  props.instance.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
)
</script>
