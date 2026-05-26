<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';
import { JWT_STORAGE_KEY } from '@/api/client';

const route = useRoute();
const router = useRouter();

const isAdmin = computed(() => {
  try {
    const token = localStorage.getItem(JWT_STORAGE_KEY);
    if (!token) return false;
    const payload = JSON.parse(atob(token.split('.')[1] ?? ''));
    return payload?.role === 'admin';
  } catch {
    return false;
  }
});

function logout() {
  localStorage.removeItem(JWT_STORAGE_KEY);
  router.push('/login');
}
</script>

<template>
  <div class="flex h-screen w-screen">
    <aside class="w-56 shrink-0 border-r bg-white p-4 flex flex-col gap-2">
      <h1 class="text-lg font-bold mb-2">NOVA 심사</h1>
      <nav class="flex flex-col gap-1 text-sm">
        <RouterLink to="/evaluate" class="px-2 py-1 rounded hover:bg-gray-100" active-class="bg-gray-200">평가</RouterLink>
        <RouterLink to="/me" class="px-2 py-1 rounded hover:bg-gray-100" active-class="bg-gray-200">내 진행률</RouterLink>
        <RouterLink to="/me/scores" class="px-2 py-1 rounded hover:bg-gray-100" active-class="bg-gray-200">내 점수</RouterLink>
        <template v-if="isAdmin">
          <div class="mt-4 mb-1 text-xs uppercase text-gray-500">Admin</div>
          <RouterLink to="/admin/teams" class="px-2 py-1 rounded hover:bg-gray-100" active-class="bg-gray-200">팀 순위</RouterLink>
          <RouterLink to="/admin/judges" class="px-2 py-1 rounded hover:bg-gray-100" active-class="bg-gray-200">심사위원</RouterLink>
          <RouterLink to="/admin/settings" class="px-2 py-1 rounded hover:bg-gray-100" active-class="bg-gray-200">설정</RouterLink>
        </template>
      </nav>
      <div class="mt-auto pt-4 border-t">
        <button class="text-sm text-gray-600 hover:text-gray-900" @click="logout">로그아웃</button>
      </div>
    </aside>
    <main class="flex-1 overflow-auto bg-gray-50">
      <RouterView :key="route.fullPath" />
    </main>
  </div>
</template>
