import { ref, watch, onUnmounted, type Ref } from 'vue';
import axios from 'axios';
import client from '@/api/client';
import type { Evaluation } from '@/types/shared';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'failed' | 'conflict';

export interface AutoSaveOptions {
  debounceMs?: number;
  teamId: Ref<string | null>;
  judgeId: Ref<string | null>;
  evaluation: Ref<Evaluation>;
  onServerUpdate?: (next: Evaluation) => void;
  onConflict?: (server: Evaluation, local: Evaluation) => Promise<'keep_local' | 'use_server'>;
}

const TTL_MS = 24 * 60 * 60 * 1000;

interface BackupEntry {
  scores: Evaluation['scores'];
  comment: string;
  savedAt: number;
  version: number;
}

function backupKey(judgeId: string, teamId: string): string {
  return `nova:eval:${judgeId}:${teamId}`;
}

export function readLocalBackup(judgeId: string, teamId: string): BackupEntry | null {
  try {
    const raw = localStorage.getItem(backupKey(judgeId, teamId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BackupEntry;
    if (Date.now() - parsed.savedAt > TTL_MS) {
      localStorage.removeItem(backupKey(judgeId, teamId));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeLocalBackup(judgeId: string, teamId: string, ev: Evaluation): void {
  const entry: BackupEntry = {
    scores: ev.scores,
    comment: ev.comment,
    savedAt: Date.now(),
    version: ev.version,
  };
  localStorage.setItem(backupKey(judgeId, teamId), JSON.stringify(entry));
}

export function clearLocalBackup(judgeId: string, teamId: string): void {
  localStorage.removeItem(backupKey(judgeId, teamId));
}

export function useAutoSave(opts: AutoSaveOptions) {
  const debounce = opts.debounceMs ?? 800;
  const status = ref<SaveStatus>('idle');
  const lastError = ref<string | null>(null);
  let timer: ReturnType<typeof setTimeout> | null = null;
  let inFlight = false;
  let pending = false;

  async function flush() {
    pending = false;
    const teamId = opts.teamId.value;
    const judgeId = opts.judgeId.value;
    if (!teamId || !judgeId) return;
    const snapshot = JSON.parse(JSON.stringify(opts.evaluation.value)) as Evaluation;
    if (snapshot.scores.length === 0 && !snapshot.comment) {
      status.value = 'idle';
      return;
    }
    inFlight = true;
    status.value = 'saving';
    try {
      const res = await client.patch<Evaluation>(`/evaluations/${teamId}`, {
        scores: snapshot.scores,
        comment: snapshot.comment,
      }, {
        headers: snapshot.version > 0 ? { 'If-Match': String(snapshot.version) } : {},
      });
      const server = res.data;
      opts.onServerUpdate?.(server);
      writeLocalBackup(judgeId, teamId, server);
      status.value = 'saved';
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409 && err.response.data?.current) {
        status.value = 'conflict';
        const serverEval = err.response.data.current as Evaluation;
        if (opts.onConflict) {
          const decision = await opts.onConflict(serverEval, snapshot);
          if (decision === 'use_server') {
            opts.onServerUpdate?.(serverEval);
            writeLocalBackup(judgeId, teamId, serverEval);
            status.value = 'saved';
          } else {
            const retry = await client.patch<Evaluation>(`/evaluations/${teamId}`, {
              scores: snapshot.scores,
              comment: snapshot.comment,
            }, {
              headers: { 'If-Match': String(serverEval.version) },
            });
            opts.onServerUpdate?.(retry.data);
            writeLocalBackup(judgeId, teamId, retry.data);
            status.value = 'saved';
          }
        }
      } else {
        lastError.value = err instanceof Error ? err.message : String(err);
        status.value = 'failed';
        writeLocalBackup(judgeId, teamId, snapshot);
      }
    } finally {
      inFlight = false;
      if (pending) {
        scheduleSave();
      }
    }
  }

  function scheduleSave() {
    if (inFlight) {
      pending = true;
      return;
    }
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      void flush();
    }, debounce);
  }

  function triggerSaveNow() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    void flush();
  }

  watch(
    () => [opts.evaluation.value.scores, opts.evaluation.value.comment],
    () => {
      if (!opts.teamId.value || !opts.judgeId.value) return;
      scheduleSave();
    },
    { deep: true },
  );

  onUnmounted(() => {
    if (timer) clearTimeout(timer);
  });

  return { status, lastError, flush: triggerSaveNow };
}
