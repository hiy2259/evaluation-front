import { defineStore } from 'pinia';
import client from '@/api/client';
import type { Evaluation, CriterionScore } from '@/types/shared';

interface EvalState {
  byTeam: Record<string, Evaluation>;
  loaded: boolean;
  loading: boolean;
}

function emptyEval(judgeId: string, teamId: string): Evaluation {
  return {
    judgeId,
    teamId,
    scores: [],
    comment: '',
    version: 0,
  };
}

export const useEvaluationsStore = defineStore('evaluations', {
  state: (): EvalState => ({ byTeam: {}, loaded: false, loading: false }),
  getters: {
    getOrEmpty: (s) => (teamId: string, judgeId: string): Evaluation =>
      s.byTeam[teamId] ?? emptyEval(judgeId, teamId),
    isComplete: (s) => (teamId: string, requiredCount: number): boolean => {
      const ev = s.byTeam[teamId];
      if (!ev) return false;
      if (ev.scores.length !== requiredCount) return false;
      return ev.scores.every((sc: CriterionScore) =>
        typeof sc.value === 'number' && sc.value >= 1 && sc.value <= 5,
      );
    },
    completedCount: (s) => (requiredCount: number): number => {
      let n = 0;
      for (const ev of Object.values(s.byTeam)) {
        if (ev.scores.length === requiredCount &&
            ev.scores.every((sc: CriterionScore) => typeof sc.value === 'number' && sc.value >= 1 && sc.value <= 5)) {
          n++;
        }
      }
      return n;
    },
  },
  actions: {
    async fetchMe() {
      if (this.loading) return;
      this.loading = true;
      try {
        const res = await client.get<Evaluation[]>('/me/evaluations');
        const map: Record<string, Evaluation> = {};
        for (const e of res.data) map[e.teamId] = e;
        this.byTeam = map;
        this.loaded = true;
      } finally {
        this.loading = false;
      }
    },
    upsertLocal(ev: Evaluation) {
      this.byTeam = { ...this.byTeam, [ev.teamId]: ev };
    },
  },
});
