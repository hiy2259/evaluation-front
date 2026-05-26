<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useTeamsStore } from '@/stores/teams';
import { useCriteriaStore } from '@/stores/criteria';
import { useEvaluationsStore } from '@/stores/evaluations';
import { useToastStore } from '@/stores/toast';
import { useAutoSave, readLocalBackup } from '@/composables/useAutoSave';
import type { Evaluation, CriterionScore } from '@/types/shared';

const auth = useAuthStore();
const teams = useTeamsStore();
const criteria = useCriteriaStore();
const evals = useEvaluationsStore();
const toast = useToastStore();
const route = useRoute();
const router = useRouter();

const selectedTeamId = ref<string | null>(null);
const divisionFilter = ref<string>('');

const currentEval = ref<Evaluation>({ judgeId: '', teamId: '', scores: [], comment: '', version: 0 });

const filteredTeams = computed(() => {
  if (!divisionFilter.value) return teams.list;
  return teams.list.filter((t) => t.divisionId === divisionFilter.value);
});

const team = computed(() => selectedTeamId.value ? teams.byId(selectedTeamId.value) : undefined);

function scoreFor(criterionId: string): number {
  const sc = currentEval.value.scores.find((s) => s.criterionId === criterionId);
  return sc?.value ?? 0;
}

function setScore(criterionId: string, value: number) {
  const next: CriterionScore[] = [...currentEval.value.scores];
  const idx = next.findIndex((s) => s.criterionId === criterionId);
  if (idx >= 0) next[idx] = { criterionId, value };
  else next.push({ criterionId, value });
  currentEval.value = { ...currentEval.value, scores: next };
}

const weightedTotal = computed(() => {
  let sum = 0;
  for (const c of criteria.list) {
    const v = scoreFor(c._id);
    if (v >= 1 && v <= 5) sum += (v / 5) * c.weight;
  }
  return Math.round(sum * 100) / 100;
});

const isComplete = computed(() =>
  criteria.list.length > 0 &&
  criteria.list.every((c) => {
    const v = scoreFor(c._id);
    return v >= 1 && v <= 5;
  }),
);

const teamIdRef = computed(() => selectedTeamId.value);
const judgeIdRef = computed(() => auth.judgeId);

const { status: saveStatus } = useAutoSave({
  teamId: teamIdRef,
  judgeId: judgeIdRef,
  evaluation: currentEval,
  onServerUpdate: (next) => {
    currentEval.value = next;
    evals.upsertLocal(next);
  },
  onConflict: async (server, local) => {
    const useServer = window.confirm(
      `다른 기기에서 변경된 점수가 있습니다.\n\n` +
      `[취소] 내 입력 유지 (서버에 덮어쓰기)\n[확인] 서버 값 사용`,
    );
    if (useServer) {
      toast.push('서버 값을 불러왔습니다');
      return 'use_server';
    }
    toast.push('내 입력으로 덮어씁니다');
    return 'keep_local';
  },
});

const saveLabel = computed(() => {
  switch (saveStatus.value) {
    case 'saving': return '저장 중...';
    case 'saved': return '저장됨';
    case 'failed': return '저장 실패 (로컬 보관)';
    case 'conflict': return '충돌 해결 중';
    default: return '대기';
  }
});

function selectTeam(teamId: string) {
  selectedTeamId.value = teamId;
  router.replace({ query: { ...route.query, teamId } });
}

function moveTeam(delta: number) {
  if (!selectedTeamId.value) return;
  const list = filteredTeams.value;
  const idx = list.findIndex((t) => t._id === selectedTeamId.value);
  if (idx < 0) return;
  const nextIdx = idx + delta;
  if (nextIdx < 0 || nextIdx >= list.length) return;
  selectTeam(list[nextIdx]._id);
}

function loadEvalForTeam(teamId: string | null) {
  if (!teamId || !auth.judgeId) {
    currentEval.value = { judgeId: '', teamId: '', scores: [], comment: '', version: 0 };
    return;
  }
  const server = evals.byTeam[teamId];
  const local = readLocalBackup(auth.judgeId, teamId);
  if (server && local && local.savedAt > Date.parse(server.updatedAt ?? '1970-01-01')) {
    const useLocal = window.confirm(
      `로컬에 더 최신 임시 저장본이 있습니다.\n` +
      `[확인] 로컬 사본 사용 (서버에 다시 저장됨)\n[취소] 서버 값 사용`,
    );
    if (useLocal) {
      currentEval.value = {
        judgeId: auth.judgeId,
        teamId,
        scores: local.scores,
        comment: local.comment,
        version: server.version,
      };
      return;
    }
  }
  currentEval.value = server ?? { judgeId: auth.judgeId, teamId, scores: [], comment: '', version: 0 };
}

onMounted(async () => {
  await Promise.all([
    teams.loaded ? Promise.resolve() : teams.fetchAll(),
    criteria.loaded ? Promise.resolve() : criteria.fetchAll(),
    evals.loaded ? Promise.resolve() : evals.fetchMe(),
  ]);
  const fromQuery = typeof route.query.teamId === 'string' ? route.query.teamId : null;
  selectedTeamId.value = fromQuery && teams.byId(fromQuery) ? fromQuery : (teams.list[0]?._id ?? null);
  loadEvalForTeam(selectedTeamId.value);
});

watch(selectedTeamId, (id) => loadEvalForTeam(id));

watch(() => route.query.teamId, (q) => {
  if (typeof q === 'string' && q !== selectedTeamId.value) selectedTeamId.value = q;
});
</script>

<template>
  <div class="flex h-full">
    <aside class="w-72 shrink-0 border-r bg-white flex flex-col">
      <div class="p-3 border-b">
        <select v-model="divisionFilter" class="w-full text-sm border rounded px-2 py-1">
          <option value="">전체 본부</option>
          <option v-for="d in teams.divisions" :key="d.id" :value="d.id">{{ d.name }}</option>
        </select>
      </div>
      <ul class="flex-1 overflow-auto text-sm">
        <li
          v-for="t in filteredTeams"
          :key="t._id"
          class="px-3 py-2 cursor-pointer border-b hover:bg-gray-50 flex items-center gap-2"
          :class="{ 'bg-blue-50': t._id === selectedTeamId }"
          @click="selectTeam(t._id)"
        >
          <span
            class="inline-block w-2 h-2 rounded-full"
            :class="evals.isComplete(t._id, criteria.list.length) ? 'bg-green-500' : 'bg-gray-300'"
            :title="evals.isComplete(t._id, criteria.list.length) ? '완료' : '미완료'"
          ></span>
          <span class="text-xs text-gray-500 w-12 shrink-0">{{ t.divisionName }}</span>
          <span class="truncate">{{ t.name }}</span>
        </li>
      </ul>
    </aside>
    <section class="flex-1 overflow-auto p-6">
      <div v-if="!team" class="text-gray-500">팀을 선택하세요</div>
      <div v-else class="space-y-6">
        <header class="bg-white p-4 rounded shadow-sm">
          <div class="flex items-start justify-between">
            <div>
              <h2 class="text-xl font-bold">{{ team.name }}</h2>
              <p class="text-sm text-gray-700">{{ team.projectName }}</p>
              <p class="text-xs text-gray-500 mt-1">{{ team.oneLiner }}</p>
              <p class="text-xs text-gray-500 mt-1">접수자: {{ team.owner }} · 팀원: {{ team.members.join(', ') || '-' }}</p>
            </div>
            <div class="text-right">
              <div class="text-2xl font-bold text-blue-600">{{ weightedTotal.toFixed(1) }}</div>
              <div class="text-xs text-gray-500">환산 합 (가중)</div>
              <div class="text-xs mt-2" :class="{
                'text-blue-500': saveStatus === 'saving',
                'text-green-600': saveStatus === 'saved',
                'text-red-600': saveStatus === 'failed' || saveStatus === 'conflict',
                'text-gray-400': saveStatus === 'idle',
              }">{{ saveLabel }}</div>
            </div>
          </div>
          <div class="mt-3 flex gap-2">
            <button class="px-3 py-1 text-sm border rounded hover:bg-gray-100" @click="moveTeam(-1)">← 이전</button>
            <button class="px-3 py-1 text-sm border rounded hover:bg-gray-100" @click="moveTeam(1)">다음 →</button>
            <span v-if="isComplete" class="ml-auto text-xs text-green-600 self-center">완료</span>
          </div>
        </header>
        <div class="bg-white p-4 rounded shadow-sm space-y-3">
          <div v-for="c in criteria.list" :key="c._id" class="grid grid-cols-12 gap-3 items-center">
            <div class="col-span-4">
              <div class="font-medium">{{ c.name }} <span class="text-xs text-gray-500">({{ c.weight }}%)</span></div>
              <div class="text-xs text-gray-500">{{ c.indicator }}</div>
            </div>
            <div class="col-span-6 flex items-center gap-2">
              <input
                type="range"
                min="1" max="5" step="0.5"
                :value="scoreFor(c._id) || 3"
                class="flex-1"
                @input="setScore(c._id, Number(($event.target as HTMLInputElement).value))"
              />
            </div>
            <div class="col-span-2 text-right font-bold text-lg">{{ scoreFor(c._id) ? scoreFor(c._id).toFixed(1) : '-' }}</div>
          </div>
        </div>
        <div class="bg-white p-4 rounded shadow-sm">
          <label class="text-sm font-medium block mb-2">의견 (최대 2000자)</label>
          <textarea
            v-model="currentEval.comment"
            rows="3"
            maxlength="2000"
            class="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          ></textarea>
          <div class="text-xs text-gray-500 text-right mt-1">{{ currentEval.comment.length }}/2000</div>
        </div>
      </div>
    </section>
  </div>
</template>
