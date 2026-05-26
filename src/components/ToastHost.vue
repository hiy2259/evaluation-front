<script setup lang="ts">
import { useToastStore } from '@/stores/toast';
const toast = useToastStore();
</script>

<template>
  <div class="fixed top-4 right-4 z-50 flex flex-col gap-2">
    <div
      v-for="t in toast.items"
      :key="t.id"
      class="px-3 py-2 rounded shadow text-sm text-white"
      :class="{
        'bg-gray-700': t.level === 'info',
        'bg-green-600': t.level === 'success',
        'bg-red-600': t.level === 'error',
      }"
    >
      {{ t.text }}
    </div>
  </div>
</template>
