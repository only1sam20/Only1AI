'use client';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
let accessToken: string | null = null;

type ApiError = Error & { status?: number };

export function setAccessToken(token: string | null): void { accessToken = token; }

async function refreshToken(): Promise<boolean> {
  const response = await fetch(`${apiBaseUrl}/auth/refresh`, { method: 'POST', credentials: 'include' });
  if (!response.ok) return false;
  const body = await response.json() as { accessToken: string };
  accessToken = body.accessToken;
  return true;
}

export async function api<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  const response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers, credentials: 'include' });
  if (response.status === 401 && retry && await refreshToken()) return api<T>(path, init, false);
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string | string[] } | null;
    const error = new Error(Array.isArray(body?.message) ? body.message.join(', ') : body?.message ?? 'Something went wrong.') as ApiError;
    error.status = response.status;
    throw error;
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function login(email: string, password: string): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/auth/login`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  if (!response.ok) throw new Error('Unable to sign in. Check your credentials and email verification status.');
  accessToken = (await response.json() as { accessToken: string }).accessToken;
}

export type Only1Core = { id: string; name: string; description: string | null; status: 'active' | 'paused'; analysisIntervalMinutes: number };
export type Strategy = { id: string; name: string; timeframe: string | null; status: 'draft' | 'active'; only1CoreId: string };
export type MarketMonitor = { id: string; symbol: string; marketType: string; timeframe: string; status: 'active' | 'paused' };
