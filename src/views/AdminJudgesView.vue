<script setup lang="ts">
import { onMounted, ref } from 'vue';
import axios from 'axios';
import { createJudge, deactivateJudge, resetJudgePin, getAdminProgress } from '@/api/admin';
import { useToastStore } from '@/stores/toast';
import type { AdminProgressRow } from '@/types/shared';

const toast = useToastStore();
const progress = ref<AdminProgressRow[]>([]);
const loading = ref(false);
const newName = ref('');
const newPin = ref('');
const newRole = ref<'judge' | 'admin'>('judge');
const resetPinFor = ref<string | null>(null);
const resetPinValue = ref('');

async function refresh() {
  loading.value = true;
  try {
    progress.value = await getAdminProgress();
  } catch {
    toast.error('진행률 불러오기 실패');
  } finally {
    loading.value = false;
  }
}

async function addJudge() {
  if (!newName.value.trim() || !/^\d{4}$/.test(newPin.value)) {
    toast.error('이름과 PIN(4자리) 입력');
    return;
  }
  try {
    await createJudge({ name: newName.value.trim(), pin: newPin.value, role: newRole.value });
    toast.success('심사위원 추가');
    newName.value = '';
    newPin.value = '';
    newRole.value = 'judge';
    await refresh();
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 409) toast.error('이미 등록된 이름');
    else toast.error('추가 실패');
  }
}

async function deactivate(id: string, name: string) {
  if (!window.confirm(`${name} 심사위원을 비활성화하시겠습니까?`)) return;
  try {
    await deactivateJudge(id);
    toast.success('비활성화 완료');
    await refresh();
  } catch {
    toast.error('비활성화 실패');
  }
}

async function submitResetPin(id: string) {
  if (!/^\d{4}$/.test(resetPinValue.value)) {
    toast.error('PIN 4자리 입력');
    return;
  }
  try {
    await resetJudgePin(id, resetPinValue.value);
    toast.success('PIN 재설정');
    resetPinFor.value = null;
    resetPinValue.value = '';
  } catch {
    toast.error('PIN 재설정 실패');
  }
}

onMounted(refresh);
</script>

<template>
  <div class="p-6 space-y-6">
    <h1 class="text-xl font-bold">심사위원 관리</h1>

    <section class="bg-white p-4 rounded shadow-sm">
      <h2 class="text-sm font-semibold mb-3">신규 추가</h2>
      <form class="flex flex-wrap items-end gap-2" @submit.prevent="addJudge">
        <label class="flex flex-col gap-1 text-xs">
          <span>이름</span>
          <input v-model="newName" type="text" class="border rounded px-2 py-1 text-sm" />
        </label>
        <label class="flex flex-col gap-1 text-xs">
          <span>PIN (4자리)</span>
          <input v-model="newPin" type="password" maxlength="4" pattern="\d{4}" inputmode="numeric" class="border rounded px-2 py-1 text-sm w-24" />
        </label>
        <label class="flex flex-col gap-1 text-xs">
          <span>역할</span>
          <select v-model="newRole" class="border rounded px-2 py-1 text-sm">
            <option value="judge">judge</option>
            <option value="admin">admin</option>
          </select>
        </label>
        <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white text-sm rounded px-3 py-1">추가</button>
      </form>
    </section>

    <section class="bg-white p-4 rounded shadow-sm">
      <div class="flex items-center mb-3">
        <h2 class="text-sm font-semibold">진행률</h2>
        <button class="ml-auto text-xs border rounded px-2 py-1 hover:bg-gray-100" @click="refresh">새로고침</button>
      </div>
      <table v-if="!loading" class="min-w-full text-sm">
        <thead class="bg-gray-100 text-xs uppercase text-gray-600">
          <tr>
            <th class="px-3 py-2 text-left">이름</th>
            <th class="px-3 py-2 text-right">완료</th>
            <th class="px-3 py-2 text-right">전체</th>
            <th class="px-3 py-2 text-right">진행</th>
            <th class="px-3 py-2 text-right">동작</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in progress" :key="row.judgeId" class="border-t">
            <td class="px-3 py-2">{{ row.judgeName }}</td>
            <td class="px-3 py-2 text-right">{{ row.completed }}</td>
            <td class="px-3 py-2 text-right">{{ row.total }}</td>
            <td class="px-3 py-2 text-right">
              {{ row.total === 0 ? '-' : `${Math.round((row.completed / row.total) * 100)}%` }}
            </td>
            <td class="px-3 py-2 text-right">
              <template v-if="resetPinFor === row.judgeId">
                <input v-model="resetPinValue" type="password" maxlength="4" class="border rounded px-1 py-0.5 w-16 text-xs" />
                <button class="ml-1 text-xs text-blue-600" @click="submitResetPin(row.judgeId)">저장</button>
                <button class="ml-1 text-xs text-gray-500" @click="resetPinFor = null">취소</button>
              </template>
              <template v-else>
                <button class="text-xs text-blue-600 hover:underline" @click="resetPinFor = row.judgeId">PIN 재설정</button>
                <button class="ml-2 text-xs text-red-600 hover:underline" @click="deactivate(row.judgeId, row.judgeName)">비활성화</button>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="text-gray-500">로딩...</div>
    </section>
  </div>
</template>
