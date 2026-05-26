<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useTeamsStore } from '@/stores/teams';
import { useCriteriaStore } from '@/stores/criteria';
import { useEvaluationsStore } from '@/stores/evaluations';

const auth = useAuthStore();
const teams = useTeamsStore();
const criteria = useCriteriaStore();
const evals = useEvaluationsStore();
const router = useRouter();

onMounted(async () => {
  await Promise.all([
    teams.loaded ? Promise.resolve() : teams.fetchAll(),
    criteria.loaded ? Promise.resolve() : criteria.fetchAll(),
    evals.loaded ? Promise.resolve() : evals.fetchMe(),
  ]);
});

const totalTeams = computed(() => teams.list.length);
const completed = computed(() => evals.completedCount(criteria.list.length));
const remaining = computed(() => teams.list.filter((t) => !evals.isComplete(t._id, criteria.list.length)));

function goEvaluate(teamId: string) {
  router.push({ name: 'evaluate', query: { teamId } });
}
</script>

<template>
  <div class="p-6 space-y-4">
    <h1 class="text-xl font-bold">내 진행률</h1>
    <div class="bg-white p-6 rounded shadow-sm flex items-baseline gap-4">
      <div class="text-4xl font-bold text-blue-600">{{ completed }}</div>
      <div class="text-gray-500">/ {{ totalTeams }} 완료</div>
      <div class="ml-auto text-sm text-gray-500">{{ auth.judgeName }}</div>
    </div>
    <div class="bg-white p-4 rounded shadow-sm">
      <h2 class="text-sm font-semibold mb-2">미완료 ({{ remaining.length }}팀)</h2>
      <div v-if="remaining.length === 0" class="text-sm text-green-600">모든 팀 평가 완료</div>
      <ul v-else class="grid grid-cols-2 lg:grid-cols-3 gap-2">
        <li
          v-for="t in remaining"
          :key="t._id"
          class="border rounded px-3 py-2 text-sm cursor-pointer hover:bg-blue-50"
          @click="goEvaluate(t._id)"
        >
          <div class="text-xs text-gray-500">{{ t.divisionName }}</div>
          <div class="font-medium">{{ t.name }}</div>
        </li>
      </ul>
    </div>
  </div>
</template>
