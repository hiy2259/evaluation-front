import { defineStore } from 'pinia';
import { postLogin } from '@/api/auth';
import { JWT_STORAGE_KEY } from '@/api/client';
import type { Judge } from '@/types/shared';

const JUDGE_STORAGE_KEY = 'nova:judge';

interface AuthState {
  token: string | null;
  judge: Judge | null;
}

function loadJudge(): Judge | null {
  try {
    const raw = localStorage.getItem(JUDGE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Judge) : null;
  } catch {
    return null;
  }
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: typeof localStorage !== 'undefined' ? localStorage.getItem(JWT_STORAGE_KEY) : null,
    judge: loadJudge(),
  }),
  getters: {
    isAuthed: (s) => !!s.token,
    isAdmin: (s) => s.judge?.role === 'admin',
    judgeId: (s) => s.judge?._id ?? null,
    judgeName: (s) => s.judge?.name ?? '',
  },
  actions: {
    async login(name: string, pin: string) {
      const { token, judge } = await postLogin({ name, pin });
      this.token = token;
      this.judge = judge;
      localStorage.setItem(JWT_STORAGE_KEY, token);
      localStorage.setItem(JUDGE_STORAGE_KEY, JSON.stringify(judge));
    },
    logout() {
      this.token = null;
      this.judge = null;
      localStorage.removeItem(JWT_STORAGE_KEY);
      localStorage.removeItem(JUDGE_STORAGE_KEY);
    },
  },
});
