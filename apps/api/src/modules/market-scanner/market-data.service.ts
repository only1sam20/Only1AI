import { BadRequestException, HttpException, HttpStatus, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const SUPPORTED_TIMEFRAMES = ['1min', '5min', '15min', '30min', '45min', '1h', '2h', '4h', '8h', '1day', '1week', '1month'] as const;
export type MarketTimeframe = typeof SUPPORTED_TIMEFRAMES[number];
export type MarketBar = { time: number; open: number; high: number; low: number; close: number; volume?: number };
export type MarketCandles = {
  provider: 'twelve-data'; symbol: string; timeframe: MarketTimeframe;
  currency: string | null; exchange: string | null; timezone: string;
  fetchedAt: string; lastBarAt: string; bars: MarketBar[]; cached: boolean;
};
export type MarketSnapshot = { provider: 'twelve-data'; symbol: string; price: number; currency?: string; asOf: string };

export function normalizeTimeframe(value: string): MarketTimeframe {
  const aliases: Record<string, MarketTimeframe> = {
    '1m': '1min', '5m': '5min', '15m': '15min', '30m': '30min', '45m': '45min',
    '1d': '1day', d: '1day', '1w': '1week', w: '1week', '1mo': '1month', m: '1month',
  };
  const trimmed = value.trim();
  const normalized = trimmed === '1M' ? '1month' : (aliases[trimmed.toLowerCase()] ?? trimmed.toLowerCase());
  if (!SUPPORTED_TIMEFRAMES.includes(normalized as MarketTimeframe)) throw new BadRequestException('Choose a supported market timeframe.');
  return normalized as MarketTimeframe;
}

export function normalizeMarketSymbol(value: string): string {
  const symbol = value.trim().toUpperCase();
  if (!/^[A-Z0-9./:-]{1,32}$/.test(symbol)) throw new BadRequestException('The requested market symbol is invalid.');
  return symbol;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function invalidPayload(): never {
  throw new ServiceUnavailableException('Market data provider returned invalid candle data. Please retry.');
}

function numeric(value: unknown, allowZero = false): number {
  if ((typeof value !== 'string' && typeof value !== 'number') || (typeof value === 'string' && !/^\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(value))) return invalidPayload();
  const result = Number(value);
  if (!Number.isFinite(result) || (allowZero ? result < 0 : result <= 0)) return invalidPayload();
  return result;
}

function barTimestamp(value: unknown, daily: boolean): number {
  if (typeof value !== 'string') return invalidPayload();
  const pattern = daily ? /^\d{4}-\d{2}-\d{2}$/ : /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/;
  if (!pattern.test(value)) return invalidPayload();
  const iso = daily ? `${value}T00:00:00Z` : `${value.replace(' ', 'T')}Z`;
  const milliseconds = Date.parse(iso);
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return invalidPayload();
  // Reject rollover dates (e.g. February 30) and malformed time components.
  if (new Date(milliseconds).toISOString().slice(0, daily ? 10 : 19) !== (daily ? value : value.replace(' ', 'T'))) return invalidPayload();
  return milliseconds / 1000;
}

@Injectable()
export class MarketDataService {
  private readonly cache = new Map<string, { expiresAt: number; data: MarketCandles }>();
  private readonly inflight = new Map<string, Promise<MarketCandles>>();
  private requestTimes: number[] = [];

  constructor(private readonly config: ConfigService) {}

  capabilities() {
    return { configured: Boolean(this.apiKey()), provider: 'twelve-data' as const, supportedTimeframes: [...SUPPORTED_TIMEFRAMES] };
  }

  async snapshot(symbol: string): Promise<MarketSnapshot> {
    const data = await this.candles(symbol, '1min');
    return { provider: data.provider, symbol: data.symbol, price: data.bars[data.bars.length - 1].close, ...(data.currency ? { currency: data.currency } : {}), asOf: data.lastBarAt };
  }

  async candles(symbol: string, timeframe: string): Promise<MarketCandles> {
    const apiKey = this.apiKey();
    if (!apiKey) throw new ServiceUnavailableException('Market data is not configured yet. Add TWELVE_DATA_API_KEY on the server.');
    const normalizedSymbol = normalizeMarketSymbol(symbol);
    const interval = normalizeTimeframe(timeframe);
    const key = `${normalizedSymbol}:${interval}`;
    const now = Date.now();
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > now) return this.copy(cached.data, true);
    if (cached) this.cache.delete(key);
    const pending = this.inflight.get(key);
    if (pending) return this.copy(await pending, true);

    this.requestTimes = this.requestTimes.filter(time => time > now - 60_000);
    if (this.requestTimes.length >= this.setting('MARKET_DATA_MAX_REQUESTS_PER_MINUTE', 8, 1, 600)) {
      throw new HttpException('Market data request limit reached. Please retry shortly.', HttpStatus.TOO_MANY_REQUESTS);
    }
    this.requestTimes.push(now);
    const request = this.fetchCandles(normalizedSymbol, interval, apiKey);
    this.inflight.set(key, request);
    try {
      const data = await request;
      // Entries have bounded lifetime and the cache cannot grow without limit.
      for (const [cacheKey, entry] of this.cache) if (entry.expiresAt <= Date.now()) this.cache.delete(cacheKey);
      const maximum = this.setting('MARKET_DATA_CACHE_MAX_ENTRIES', 200, 1, 1000);
      while (this.cache.size >= maximum) this.cache.delete(this.cache.keys().next().value!);
      this.cache.set(key, { data, expiresAt: Date.now() + this.setting('MARKET_DATA_CACHE_TTL_MS', 60_000, 5_000, 300_000) });
      return this.copy(data, false);
    } finally {
      this.inflight.delete(key);
    }
  }

  private apiKey(): string {
    return this.config.get<string>('TWELVE_DATA_API_KEY')?.trim() ?? '';
  }

  private setting(name: string, fallback: number, minimum: number, maximum: number): number {
    const configured = Number(this.config.get<string>(name));
    return Number.isFinite(configured) && configured > 0 ? Math.min(maximum, Math.max(minimum, Math.floor(configured))) : fallback;
  }

  private copy(data: MarketCandles, cached: boolean): MarketCandles {
    return { ...data, cached, bars: data.bars.map(bar => ({ ...bar })) };
  }

  private async fetchCandles(symbol: string, interval: MarketTimeframe, apiKey: string): Promise<MarketCandles> {
    const daily = ['1day', '1week', '1month'].includes(interval);
    const url = new URL('https://api.twelvedata.com/time_series');
    url.searchParams.set('symbol', symbol);
    url.searchParams.set('interval', interval);
    url.searchParams.set('outputsize', '300');
    url.searchParams.set('order', 'asc');
    url.searchParams.set('timezone', 'UTC');
    url.searchParams.set('apikey', apiKey);
    let response: Response;
    let body: unknown;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(this.setting('MARKET_DATA_TIMEOUT_MS', 8_000, 1_000, 15_000)) });
      if (!response.ok) throw new Error('Provider HTTP failure');
      body = await response.json();
    } catch {
      // Never return upstream messages, request URLs, or thrown errors containing credentials.
      throw new ServiceUnavailableException('Market data provider is unavailable. Please retry.');
    }
    if (!isRecord(body) || body.status !== 'ok' || !isRecord(body.meta) || !Array.isArray(body.values) || body.values.length === 0 || body.values.length > 300) return invalidPayload();
    if (body.meta.interval !== interval || typeof body.meta.symbol !== 'string' || body.meta.symbol.toUpperCase() !== symbol) return invalidPayload();
    const safeMetadata = (value: unknown): string | null => {
      if (value === undefined || value === null || value === '') return null;
      if (typeof value !== 'string' || value.length > 100 || value.includes(apiKey) || [...value].some(character => character.charCodeAt(0) < 32)) return invalidPayload();
      return value;
    };
    const exchangeTimezone = safeMetadata(body.meta.exchange_timezone);
    if (daily && !exchangeTimezone) return invalidPayload();
    if (exchangeTimezone) {
      try { new Intl.DateTimeFormat('en', { timeZone: exchangeTimezone }); } catch { return invalidPayload(); }
    }
    const unique = new Map<number, MarketBar>();
    for (const value of body.values) {
      if (!isRecord(value)) return invalidPayload();
      const time = barTimestamp(value.datetime, daily);
      const open = numeric(value.open), high = numeric(value.high), low = numeric(value.low), close = numeric(value.close);
      if (low > high || open < low || open > high || close < low || close > high) return invalidPayload();
      const bar: MarketBar = { time, open, high, low, close };
      if (value.volume !== undefined && value.volume !== null) bar.volume = numeric(value.volume, true);
      // Provider duplicates are collapsed; the final occurrence is authoritative.
      unique.set(time, bar);
    }
    const bars = [...unique.values()].sort((a, b) => a.time - b.time);
    // Daily/weekly/monthly bars are exchange calendar dates encoded at UTC midnight
    // for chart ordering. They are not actual UTC exchange session-open instants.
    return {
      provider: 'twelve-data', symbol, timeframe: interval,
      currency: safeMetadata(body.meta.currency), exchange: safeMetadata(body.meta.exchange),
      timezone: daily ? exchangeTimezone! : 'UTC', fetchedAt: new Date().toISOString(),
      lastBarAt: new Date(bars[bars.length - 1].time * 1000).toISOString(), bars, cached: false,
    };
  }
}
