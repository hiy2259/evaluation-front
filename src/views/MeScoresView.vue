<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useTeamsStore } from '@/stores/teams';
import { useCriteriaStore } from '@/stores/criteria';
import { useEvaluationsStore } from '@/stores/evaluations';

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

function scoreFor(teamId: string, criterionId: string): number | null {
  const ev = evals.byTeam[teamId];
  if (!ev) return null;
  return ev.scores.find((s) => s.criterionId === criterionId)?.value ?? null;
}

function weightedTotal(teamId: string): number | null {
  const ev = evals.byTeam[teamId];
  if (!ev || ev.scores.length === 0) return null;
  let sum = 0;
  for (const c of criteria.list) {
    const v = scoreFor(teamId, c._id);
    if (v == null) return null;
    sum += (v / 5) * c.weight;
  }
  return Math.round(sum * 100) / 100;
}

const sortedTeams = computed(() => [...teams.list].sort((a, b) => {
  if (a.divisionName !== b.divisionName) return a.divisionName.localeCompare(b.divisionName);
  return a.name.localeCompare(b.name);
}));

function goCell(teamId: string) {
  router.push({ name: 'evaluate', query: { teamId } });
}
</script>

<template>
  <div class="p-6 space-y-4">
    <h1 class="text-xl font-bold">내 점수 일람</h1>
    <div class="bg-white rounded shadow-sm overflow-auto">
      <table class="min-w-full text-sm">
        <thead class="bg-gray-100 text-xs uppercase text-gray-600">
          <tr>
            <th class="px-3 py-2 text-left">본부</th>
            <th class="px-3 py-2 text-left">팀</th>
            <th
              v-for="c in criteria.list"
              :key="c._id"
              class="px-3 py-2 text-center"
              :title="c.indicator"
            >{{ c.name }}<br><span class="text-gray-400">({{ c.weight }}%)</span></th>
            <th class="px-3 py-2 text-right">환산합</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="t in sortedTeams"
            :key="t._id"
            class="border-t hover:bg-blue-50"
          >
            <td class="px-3 py-2 text-xs text-gray-500">{{ t.divisionName }}</td>
            <td class="px-3 py-2 font-medium cursor-pointer" @click="goCell(t._id)">{{ t.name }}</td>
            <td
              v-for="c in criteria.list"
              :key="c._id"
              class="px-3 py-2 text-center cursor-pointer"
              :class="scoreFor(t._id, c._id) == null ? 'text-gray-300' : ''"
              @click="goCell(t._id)"
            >{{ scoreFor(t._id, c._id) ?? '-' }}</td>
            <td class="px-3 py-2 text-right font-semibold cursor-pointer" @click="goCell(t._id)">
              {{ weightedTotal(t._id) == null ? '-' : weightedTotal(t._id)!.toFixed(1) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
