import { defineStore } from 'pinia';

export type ToastLevel = 'info' | 'success' | 'error';

export interface ToastItem {
  id: number;
  text: string;
  level: ToastLevel;
}

let seq = 0;

export const useToastStore = defineStore('toast', {
  state: () => ({ items: [] as ToastItem[] }),
  actions: {
    push(text: string, level: ToastLevel = 'info', ttl = 3000) {
      const id = ++seq;
      this.items.push({ id, text, level });
      setTimeout(() => {
        this.items = this.items.filter((t) => t.id !== id);
      }, ttl);
    },
    success(text: string) {
      this.push(text, 'success');
    },
    error(text: string) {
      this.push(text, 'error', 5000);
    },
  },
});
