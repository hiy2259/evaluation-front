import { defineStore } from 'pinia';
import client from '@/api/client';
import type { Team } from '@/types/shared';

export interface TeamWithDivision extends Team {
  divisionName: string;
}

interface TeamsState {
  list: TeamWithDivision[];
  loaded: boolean;
  loading: boolean;
}

export const useTeamsStore = defineStore('teams', {
  state: (): TeamsState => ({ list: [], loaded: false, loading: false }),
  getters: {
    byId: (s) => (id: string) => s.list.find((t) => t._id === id),
    divisions: (s) => {
      const map = new Map<string, string>();
      for (const t of s.list) map.set(t.divisionId, t.divisionName);
      return Array.from(map, ([id, name]) => ({ id, name }));
    },
  },
  actions: {
    async fetchAll() {
      if (this.loading) return;
      this.loading = true;
      try {
        const res = await client.get<TeamWithDivision[]>('/teams');
        this.list = res.data;
        this.loaded = true;
      } finally {
        this.loading = false;
      }
    },
  },
});
