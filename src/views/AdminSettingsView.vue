<script setup lang="ts">
import { onMounted, ref } from 'vue';
import client from '@/api/client';
import { patchSettings } from '@/api/admin';
import { useToastStore } from '@/stores/toast';
import type { Settings } from '@/types/shared';

const toast = useToastStore();
const settings = ref<Settings | null>(null);
const loading = ref(false);
const saving = ref(false);

async function load() {
  loading.value = true;
  try {
    const res = await client.get<Settings>('/admin/settings').catch(async () => {
      return { data: { _id: 'singleton' as const, disclosureOpen: false } } as { data: Settings };
    });
    settings.value = res.data;
  } finally {
    loading.value = false;
  }
}

async function toggle() {
  if (!settings.value || saving.value) return;
  saving.value = true;
  const next = !settings.value.disclosureOpen;
  try {
    const updated = await patchSettings({ disclosureOpen: next });
    settings.value = updated;
    toast.success(`결과 공개 ${next ? 'ON' : 'OFF'}`);
  } catch {
    toast.error('변경 실패');
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="p-6 space-y-4">
    <h1 class="text-xl font-bold">시스템 설정</h1>
    <section class="bg-white p-4 rounded shadow-sm space-y-3">
      <div class="flex items-center justify-between">
        <div>
          <div class="font-medium">결과 공개</div>
          <div class="text-xs text-gray-500">활성 시 일반 심사위원도 `/admin/teams` 순위표 접근 가능</div>
        </div>
        <button
          class="px-4 py-2 rounded text-white text-sm font-medium"
          :class="settings?.disclosureOpen ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 hover:bg-gray-500'"
          :disabled="loading || saving"
          @click="toggle"
        >
          {{ settings?.disclosureOpen ? '공개 중 (끄기)' : '비공개 (켜기)' }}
        </button>
      </div>
    </section>
  </div>
</template>
