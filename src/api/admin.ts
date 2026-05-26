import client from './client';
import type { AdminProgressRow, Judge, Settings } from '@/types/shared';

export async function createJudge(body: { name: string; pin: string; role?: 'judge' | 'admin' }): Promise<Judge> {
  const res = await client.post<Judge>('/admin/judges', body);
  return res.data;
}

export async function deactivateJudge(id: string): Promise<void> {
  await client.delete(`/admin/judges/${id}`);
}

export async function resetJudgePin(id: string, pin: string): Promise<void> {
  await client.patch(`/admin/judges/${id}/pin`, { pin });
}

export async function getAdminProgress(): Promise<AdminProgressRow[]> {
  const res = await client.get<AdminProgressRow[]>('/admin/progress');
  return res.data;
}

export async function patchSettings(body: { disclosureOpen: boolean }): Promise<Settings> {
  const res = await client.patch<Settings>('/admin/settings', body);
  return res.data;
}
