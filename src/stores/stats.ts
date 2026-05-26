import { defineStore } from 'pinia';
import { fetchRankedTeams } from '@/api/stats';
import type { RankedTeam } from '@/types/shared';

interface StatsState {
  ranked: RankedTeam[];
  loaded: boolean;
  loading: boolean;
  error: string | null;
}

export const useStatsStore = defineStore('stats', {
  state: (): StatsState => ({ ranked: [], loaded: false, loading: false, error: null }),
  actions: {
    async fetchTeams() {
      if (this.loading) return;
      this.loading = true;
      this.error = null;
      try {
        this.ranked = await fetchRankedTeams();
        this.loaded = true;
      } catch (err) {
        this.error = err instanceof Error ? err.message : String(err);
      } finally {
        this.loading = false;
      }
    },
  },
});
