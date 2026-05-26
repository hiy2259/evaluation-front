import client from './client';
import type { RankedTeam } from '@/types/shared';

export async function fetchRankedTeams(): Promise<RankedTeam[]> {
  const res = await client.get<RankedTeam[]>('/stats/teams');
  return res.data;
}
