import type { StringValue } from 'ms';

const DEFAULT_ACCESS_TTL = '15m';
const DEFAULT_REFRESH_TTL = '7d';
const DEFAULT_PASSWORD_RESET_TTL = '1h';

const TTL_UNITS_IN_MS: Record<string, number> = {
  ms: 1,
  s: 1_000,
  m: 60_000,
  h: 60 * 60_000,
  d: 24 * 60 * 60_000,
};

/**
 * Keep the JWT expiry and the server-side session/cookie expiry aligned. We
 * deliberately accept a small, documented subset of the jsonwebtoken syntax
 * so an invalid environment value fails during use instead of silently giving
 * a session an unexpected lifetime.
 */
export function resolveTokenTtl(value: string | undefined, fallback: string, variableName: string): string {
  const ttl = (value ?? fallback).trim();
  const match = /^(\d+)(ms|s|m|h|d)$/i.exec(ttl);
  if (!match) {
    throw new Error(`${variableName} must be a positive duration such as 15m or 7d.`);
  }

  const amount = Number(match[1]);
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error(`${variableName} must be a positive duration such as 15m or 7d.`);
  }

  return `${amount}${match[2].toLowerCase()}`;
}

export function durationToMilliseconds(ttl: string, variableName: string): number {
  const match = /^(\d+)(ms|s|m|h|d)$/i.exec(ttl);
  if (!match) {
    throw new Error(`${variableName} must be a positive duration such as 15m or 7d.`);
  }

  const milliseconds = Number(match[1]) * TTL_UNITS_IN_MS[match[2].toLowerCase()];
  if (!Number.isSafeInteger(milliseconds) || milliseconds <= 0) {
    throw new Error(`${variableName} must be a positive duration such as 15m or 7d.`);
  }

  return milliseconds;
}

export function getAccessTokenTtl(): StringValue {
  return resolveTokenTtl(process.env.JWT_ACCESS_TTL, DEFAULT_ACCESS_TTL, 'JWT_ACCESS_TTL') as StringValue;
}

export function getRefreshTokenTtl(): StringValue {
  return resolveTokenTtl(process.env.JWT_REFRESH_TTL, DEFAULT_REFRESH_TTL, 'JWT_REFRESH_TTL') as StringValue;
}

export function getRefreshTokenTtlMilliseconds(): number {
  return durationToMilliseconds(getRefreshTokenTtl(), 'JWT_REFRESH_TTL');
}

export function getPasswordResetTokenTtlMilliseconds(): number {
  const ttl = resolveTokenTtl(process.env.PASSWORD_RESET_TTL, DEFAULT_PASSWORD_RESET_TTL, 'PASSWORD_RESET_TTL');
  return durationToMilliseconds(ttl, 'PASSWORD_RESET_TTL');
}
