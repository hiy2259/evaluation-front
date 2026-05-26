<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';

const auth = useAuthStore();
const toast = useToastStore();
const route = useRoute();
const router = useRouter();

const name = ref('');
const pin = ref('');
const submitting = ref(false);

async function submit() {
  if (submitting.value) return;
  if (!name.value.trim() || !/^\d{4}$/.test(pin.value)) {
    toast.error('이름과 PIN(4자리)을 입력하세요');
    return;
  }
  submitting.value = true;
  try {
    await auth.login(name.value.trim(), pin.value);
    toast.success(`${auth.judgeName} 환영합니다`);
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/evaluate';
    await router.push(redirect);
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      if (status === 429) toast.error('로그인 시도 제한. 잠시 후 다시 시도하세요');
      else if (status === 401) toast.error('이름 또는 PIN이 올바르지 않습니다');
      else toast.error('로그인 실패: 네트워크 또는 서버 오류');
    } else {
      toast.error('알 수 없는 오류');
    }
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="flex items-center justify-center h-screen bg-gray-100">
    <form
      class="bg-white p-8 rounded-lg shadow-md w-96 flex flex-col gap-4"
      @submit.prevent="submit"
    >
      <h1 class="text-xl font-bold text-center">Project NOVA 심사</h1>
      <label class="flex flex-col gap-1 text-sm">
        <span class="text-gray-700">이름</span>
        <input
          v-model="name"
          type="text"
          autocomplete="username"
          class="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          :disabled="submitting"
          required
        />
      </label>
      <label class="flex flex-col gap-1 text-sm">
        <span class="text-gray-700">PIN (4자리 숫자)</span>
        <input
          v-model="pin"
          type="password"
          inputmode="numeric"
          pattern="\d{4}"
          maxlength="4"
          autocomplete="current-password"
          class="border rounded px-3 py-2 tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
          :disabled="submitting"
          required
        />
      </label>
      <button
        type="submit"
        class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded py-2 font-medium"
        :disabled="submitting"
      >
        {{ submitting ? '로그인 중...' : '로그인' }}
      </button>
    </form>
  </div>
</template>
