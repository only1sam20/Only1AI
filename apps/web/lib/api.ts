'use client';

// Use a same-origin path so browser clients work through both Next.js development
// rewrites and the production Nginx proxy. Provider URLs stay server-side.
const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';
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

export type PreferredTrade = 'crypto' | 'forex' | 'indices' | 'all';
export type PreferredStrategy = 'smc' | 'ict' | 'algo' | 'msnr' | 'price_action' | 'custom';
export type RegistrationInput = {
  email: string;
  password: string;
  traderName: string;
  preferredTrade: PreferredTrade;
  preferredStrategy: PreferredStrategy;
  customStrategy?: string;
};

export async function register(input: RegistrationInput): Promise<{ message: string }> {
  return api<{ message: string }>('/auth/register', { method: 'POST', body: JSON.stringify(input) }, false);
}

export async function getStrategySuggestions(): Promise<string[]> {
  const result = await api<{ suggestions: string[] }>('/strategies/suggestions', {}, false);
  return result.suggestions;
}

export async function verifyEmail(token: string): Promise<void> {
  await api<void>('/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }) }, false);
}

export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  return api<{ message: string }>('/auth/password-reset/request', { method: 'POST', body: JSON.stringify({ email }) }, false);
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await api<void>('/auth/password-reset/confirm', { method: 'POST', body: JSON.stringify({ token, password }) }, false);
}

export type Only1Core = { id: string; name: string; description: string | null; status: 'active' | 'paused'; analysisIntervalMinutes: number };
export type StrategyRule = { id?: string; category: string; condition: string; value?: string | null; priority: number };
export type Strategy = { id: string; name: string; description?: string | null; timeframe: string | null; status: 'draft' | 'active'; only1CoreId: string; rules?: StrategyRule[] };
export type MarketMonitor = { id: string; symbol: string; marketType: string; timeframe: string; status: 'active' | 'paused' };
export type UserProfile = { displayName: string | null; timezone: string | null; bio: string | null; updatedAt?: string };
export type CurrentUser = { id: string; email: string; role: string; emailVerifiedAt: string | null; profile: UserProfile | null };
export type AppNotification = { id: string; type: string; title: string; body: string; readAt: string | null; createdAt: string };
export type MarketplaceListing = { id: string; title: string; description: string; status: string; createdAt: string };
