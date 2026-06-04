<template>
  <UTable :data="commands" :columns="columns" />
</template>

<script setup lang="ts">
defineProps<{ commands?: Array<Record<string, unknown>> }>()

const columns = [
  { accessorKey: 'commandKey', header: 'Command' },
  { accessorKey: 'group', header: 'Group' },
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'status', header: 'Status' }
]
</script>
