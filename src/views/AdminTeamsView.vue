<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useStatsStore } from '@/stores/stats';
import { useTeamsStore } from '@/stores/teams';
import { useCriteriaStore } from '@/stores/criteria';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import { exportRankedCSV, exportRankedXLSX } from '@/lib/export';

const stats = useStatsStore();
const teams = useTeamsStore();
const criteria = useCriteriaStore();
const auth = useAuthStore();
const toast = useToastStore();

const divisionFilter = ref<string>('');

onMounted(async () => {
  await Promise.all([
    teams.loaded ? Promise.resolve() : teams.fetchAll(),
    criteria.loaded ? Promise.resolve() : criteria.fetchAll(),
    stats.fetchTeams(),
  ]);
});

const filtered = computed(() => {
  if (!divisionFilter.value) return stats.ranked;
  return stats.ranked.filter((r) => r.divisionId === divisionFilter.value);
});

const recommendedPerDivision = computed(() => {
  const m = new Map<string, string>();
  for (const r of stats.ranked) {
    if (!m.has(r.divisionId) && r.submittedJudgeCount > 0) m.set(r.divisionId, r.teamId);
  }
  return m;
});

const hasTfDecision = computed(() => stats.ranked.some((r) => r.needsTfDecision));

function teamName(id: string): string {
  return teams.byId(id)?.name ?? id;
}

function divisionName(id: string): string {
  return teams.divisions.find((d) => d.id === id)?.name ?? id;
}

function criterionAvg(row: { perCriterionAvg: Record<string, number> }, criterionId: string): string {
  const v = row.perCriterionAvg[criterionId];
  return v != null ? v.toFixed(2) : '-';
}

function downloadCSV() {
  exportRankedCSV(stats.ranked, criteria.list, teams.list, teams.divisions);
  toast.success('CSV 다운로드');
}

function downloadXLSX() {
  exportRankedXLSX(stats.ranked, criteria.list, teams.list, teams.divisions);
  toast.success('XLSX 다운로드');
}
</script>

<template>
  <div v-if="!auth.isAdmin" class="p-8 text-center text-gray-500">
    <h2 class="text-lg font-bold mb-2">결과 공개 전</h2>
    <p>관리자가 공개 설정을 활성화하면 순위표를 볼 수 있습니다.</p>
  </div>
  <div v-else class="p-6 space-y-4">
    <div
      v-if="hasTfDecision"
      class="bg-red-50 border-l-4 border-red-500 p-3 text-sm text-red-700 rounded"
    >
      TF합의 필요 — 4단계 tie-break 까지 동점인 팀이 있습니다. 수동 결정 필요.
    </div>
    <div class="flex items-center gap-3">
      <h1 class="text-xl font-bold">팀 순위</h1>
      <select v-model="divisionFilter" class="ml-2 text-sm border rounded px-2 py-1">
        <option value="">전체 본부</option>
        <option v-for="d in teams.divisions" :key="d.id" :value="d.id">{{ d.name }}</option>
      </select>
      <div class="ml-auto flex gap-2">
        <button class="text-sm border rounded px-3 py-1 hover:bg-gray-100" @click="downloadCSV">CSV</button>
        <button class="text-sm border rounded px-3 py-1 hover:bg-gray-100" @click="downloadXLSX">XLSX</button>
        <button class="text-sm border rounded px-3 py-1 hover:bg-gray-100" @click="stats.fetchTeams">새로고침</button>
      </div>
    </div>
    <div v-if="stats.loading" class="text-gray-500">불러오는 중...</div>
    <div v-else class="bg-white rounded shadow-sm overflow-auto">
      <table class="min-w-full text-sm">
        <thead class="bg-gray-100 text-xs uppercase text-gray-600">
          <tr>
            <th class="px-3 py-2 text-left">#</th>
            <th class="px-3 py-2 text-left">본부</th>
            <th class="px-3 py-2 text-left">팀</th>
            <th class="px-3 py-2 text-right">총점</th>
            <th
              v-for="c in criteria.list"
              :key="c._id"
              class="px-3 py-2 text-right"
              :title="`raw 평균, 가중 ${c.weight}%`"
            >{{ c.name }}</th>
            <th class="px-3 py-2 text-right" title="모집단 표준편차 (n<3 시 표시 불가)">STDEV</th>
            <th class="px-3 py-2 text-right">제출자</th>
            <th class="px-3 py-2 text-center" title="0차→1차(구현)→2차(차별)→3차(문제정의)→4차(STDEV) 동점 시 TF합의">TF</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, i) in filtered"
            :key="row.teamId"
            class="border-t hover:bg-blue-50"
            :class="{ 'bg-yellow-50': recommendedPerDivision.get(row.divisionId) === row.teamId }"
          >
            <td class="px-3 py-2">{{ stats.ranked.indexOf(row) + 1 }}</td>
            <td class="px-3 py-2 text-xs text-gray-500">{{ divisionName(row.divisionId) }}</td>
            <td class="px-3 py-2 font-medium">
              {{ teamName(row.teamId) }}
              <span v-if="recommendedPerDivision.get(row.divisionId) === row.teamId" class="ml-1 text-xs text-yellow-700">★ 본선</span>
            </td>
            <td class="px-3 py-2 text-right font-bold">{{ row.totalAvg.toFixed(2) }}</td>
            <td v-for="c in criteria.list" :key="c._id" class="px-3 py-2 text-right">{{ criterionAvg(row, c._id) }}</td>
            <td class="px-3 py-2 text-right">{{ row.stddev == null ? 'n<3' : row.stddev.toFixed(3) }}</td>
            <td class="px-3 py-2 text-right">{{ row.submittedJudgeCount }}</td>
            <td class="px-3 py-2 text-center">
              <span v-if="row.needsTfDecision" class="inline-block px-2 py-0.5 rounded bg-red-500 text-white text-xs">TF</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
