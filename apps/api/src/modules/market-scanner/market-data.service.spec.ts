import { ConfigService } from '@nestjs/config';
import { MarketDataService, normalizeTimeframe } from './market-data.service';

const SECRET = 'server-only-test-secret';
const candle = (datetime = '2026-09-25 10:00:00') => ({ datetime, open: '100', high: '110', low: '90', close: '105', volume: '0' });
const payload = (interval = '15min', values: unknown[] = [candle()]) => ({ status: 'ok', meta: { symbol: 'AAPL', interval, currency: 'USD', exchange: 'NASDAQ', exchange_timezone: 'America/New_York' }, values });

describe('MarketDataService', () => {
  let service: MarketDataService;
  let fetchMock: jest.SpyInstance;
  let configValues: Record<string, string>;
  beforeEach(() => {
    configValues = { TWELVE_DATA_API_KEY: SECRET };
    service = new MarketDataService({ get: jest.fn((name: string) => configValues[name]) } as unknown as ConfigService);
    fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => payload() } as Response);
  });
  afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });

  it('reports capabilities without requesting data or disclosing server credentials', () => {
    expect(service.capabilities()).toMatchObject({ configured: true, provider: 'twelve-data', supportedTimeframes: expect.arrayContaining(['15min', '1month']) });
    expect(JSON.stringify(service.capabilities())).not.toContain(SECRET);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports missing configuration and fails without network requests', async () => {
    configValues.TWELVE_DATA_API_KEY = '   ';
    expect(service.capabilities().configured).toBe(false);
    await expect(service.candles('AAPL', '15m')).rejects.toThrow('Market data is not configured');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('normalizes aliases, requests UTC intraday OHLC and returns numeric prices with bar provenance', async () => {
    const result = await service.candles(' aapl ', '15m');
    const url = fetchMock.mock.calls[0][0] as URL;
    expect(url.pathname).toBe('/time_series');
    expect(url.searchParams.get('interval')).toBe('15min');
    expect(url.searchParams.get('timezone')).toBe('UTC');
    expect(url.searchParams.get('outputsize')).toBe('300');
    expect(result).toMatchObject({ provider: 'twelve-data', symbol: 'AAPL', timeframe: '15min', timezone: 'UTC', currency: 'USD', exchange: 'NASDAQ', cached: false, lastBarAt: '2026-09-25T10:00:00.000Z', bars: [{ time: Date.parse('2026-09-25T10:00:00Z') / 1000, open: 100, high: 110, low: 90, close: 105, volume: 0 }] });
    expect(JSON.stringify(result)).not.toContain(SECRET);
  });

  it('sorts and deduplicates provider bars, using the final duplicate', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => payload('15min', [candle('2026-09-25 10:15:00'), candle(), { ...candle(), close: '107' }]) } as Response);
    const result = await service.candles('AAPL', '15min');
    expect(result.bars).toHaveLength(2);
    expect(result.bars[0].time).toBeLessThan(result.bars[1].time);
    expect(result.bars[0].close).toBe(107);
  });

  it.each(['1day', '1week', '1month'])('preserves exchange timezone and chart calendar dates for %s', async interval => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => payload(interval, [candle('2026-09-25')]) } as Response);
    const result = await service.candles('AAPL', interval);
    expect(result.timezone).toBe('America/New_York');
    expect(result.lastBarAt).toBe('2026-09-25T00:00:00.000Z');
    // Chart calendar date remains September 25; never shift it by the exchange offset.
    expect(new Date(result.bars[0].time * 1000).toISOString().slice(0, 10)).toBe('2026-09-25');
  });

  it('deduplicates concurrent requests and serves an isolated cached copy', async () => {
    let resolve!: (response: Response) => void;
    fetchMock.mockReturnValue(new Promise<Response>(done => { resolve = done; }));
    const first = service.candles('AAPL', '15m');
    const second = service.candles('AAPL', '15min');
    resolve({ ok: true, json: async () => payload() } as Response);
    const [original, shared] = await Promise.all([first, second]);
    expect(original.cached).toBe(false);
    expect(shared.cached).toBe(true);
    original.bars[0].close = 999;
    expect((await service.candles('AAPL', '15m')).bars[0].close).toBe(105);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('expires cached data and limits the number of stored symbols/timeframes', async () => {
    jest.useFakeTimers({ now: Date.parse('2026-09-25T10:00:00Z') });
    configValues.MARKET_DATA_CACHE_TTL_MS = '5000';
    configValues.MARKET_DATA_CACHE_MAX_ENTRIES = '1';
    await service.candles('AAPL', '15min');
    jest.advanceTimersByTime(5001);
    expect((await service.candles('AAPL', '15min')).cached).toBe(false);
    fetchMock.mockResolvedValue({ ok: true, json: async () => payload('1h') } as Response);
    await service.candles('AAPL', '1h');
    fetchMock.mockResolvedValue({ ok: true, json: async () => payload() } as Response);
    expect((await service.candles('AAPL', '15min')).cached).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('enforces a shared sliding-minute provider budget while cache hits remain usable', async () => {
    jest.useFakeTimers({ now: Date.parse('2026-09-25T10:00:00Z') });
    configValues.MARKET_DATA_MAX_REQUESTS_PER_MINUTE = '1';
    await service.candles('AAPL', '15min');
    expect((await service.candles('AAPL', '15m')).cached).toBe(true);
    await expect(service.candles('AAPL', '1h')).rejects.toMatchObject({ status: 429 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(60_000);
    fetchMock.mockResolvedValue({ ok: true, json: async () => payload('1h') } as Response);
    await expect(service.candles('AAPL', '1h')).resolves.toMatchObject({ cached: false });
  });

  it('rejects invalid symbols and unsupported intervals before using the provider', async () => {
    await expect(service.candles('AAPL?apikey=stolen', '15m')).rejects.toThrow('symbol is invalid');
    await expect(service.candles('AAPL', '3m')).rejects.toThrow('supported market timeframe');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('distinguishes a monthly alias from a minute alias', () => {
    expect(normalizeTimeframe('1M')).toBe('1month');
    expect(normalizeTimeframe('1m')).toBe('1min');
    expect(normalizeTimeframe('1d')).toBe('1day');
  });

  it.each([
    null,
    { status: 'error', code: 429, message: `Api key ${SECRET} exceeded usage` },
    { ...payload(), values: [] },
    { ...payload(), values: [null] },
    payload('15min', [{ ...candle(), open: '-1' }]),
    payload('15min', [{ ...candle(), close: '111' }]),
    payload('15min', [{ ...candle(), high: '0' }]),
    payload('15min', [{ ...candle(), low: 'NaN' }]),
    payload('15min', [{ ...candle(), open: null }]),
    payload('15min', [{ ...candle(), volume: '-1' }]),
    payload('15min', [candle('2026-02-30 10:00:00')]),
    payload('15min', [candle('2026-09-25 25:00:00')]),
    payload('15min', [candle('2026-09-25')]),
    payload('1h'),
    { ...payload(), meta: { ...payload().meta, symbol: 'MSFT' } },
    { ...payload(), meta: { ...payload().meta, exchange: SECRET } },
  ])('rejects malformed and unsuccessful provider payload %j without exposing credentials', async invalid => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => invalid } as Response);
    try { await service.candles('AAPL', '15m'); throw new Error('Expected provider failure'); }
    catch (error) { expect(error).toMatchObject({ status: 503 }); expect(String(error)).not.toContain(SECRET); }
  });

  it('sanitizes transport errors and allows retry after failure', async () => {
    fetchMock.mockRejectedValueOnce(new Error(`Connection failed to https://example.com?apikey=${SECRET}`));
    await expect(service.candles('AAPL', '15m')).rejects.toThrow('Market data provider is unavailable');
    await expect(service.candles('AAPL', '15m')).resolves.toMatchObject({ cached: false });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('sanitizes non-JSON responses and HTTP failures', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => { throw new Error(SECRET); } } as unknown as Response);
    await expect(service.candles('AAPL', '15m')).rejects.toThrow('Market data provider is unavailable');
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ message: SECRET }) } as Response);
    await expect(service.candles('AAPL', '15m')).rejects.toThrow('Market data provider is unavailable');
  });

  it('uses the latest candle close and actual bar timestamp for backward-compatible snapshots', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => payload('1min') } as Response);
    await expect(service.snapshot('AAPL')).resolves.toEqual({ provider: 'twelve-data', symbol: 'AAPL', price: 105, currency: 'USD', asOf: '2026-09-25T10:00:00.000Z' });
  });
});
