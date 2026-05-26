import client from './client';
import type { LoginRequest, LoginResponse } from '@/types/shared';

export async function postLogin(body: LoginRequest): Promise<LoginResponse> {
  const res = await client.post<LoginResponse>('/auth/login', body);
  return res.data;
}
