import { defineStore } from 'pinia';
import client from '@/api/client';
import type { Criterion } from '@/types/shared';

interface CriteriaState {
  list: Criterion[];
  loaded: boolean;
  loading: boolean;
}

export const useCriteriaStore = defineStore('criteria', {
  state: (): CriteriaState => ({ list: [], loaded: false, loading: false }),
  getters: {
    byId: (s) => (id: string) => s.list.find((c) => c._id === id),
    totalWeight: (s) => s.list.reduce((acc, c) => acc + c.weight, 0),
  },
  actions: {
    async fetchAll() {
      if (this.loading) return;
      this.loading = true;
      try {
        const res = await client.get<Criterion[]>('/criteria');
        this.list = [...res.data].sort((a, b) => a.order - b.order);
        this.loaded = true;
      } finally {
        this.loading = false;
      }
    },
  },
});
