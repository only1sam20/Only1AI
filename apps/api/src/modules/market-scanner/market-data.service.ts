import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type MarketSnapshot = {
  provider: 'twelve-data';
  symbol: string;
  price: number;
  currency?: string;
  asOf: string;
};

type TwelveDataPrice = { price?: string; code?: number; message?: string };

@Injectable()
export class MarketDataService {
  constructor(private readonly config: ConfigService) {}

  async snapshot(symbol: string): Promise<MarketSnapshot> {
    const apiKey = this.config.get<string>('TWELVE_DATA_API_KEY');
    if (!apiKey) throw new ServiceUnavailableException('Market data is not configured yet. Add TWELVE_DATA_API_KEY on the server.');

    const normalizedSymbol = symbol.trim().toUpperCase();
    if (!/^[A-Z0-9./:-]{1,32}$/.test(normalizedSymbol)) {
      throw new ServiceUnavailableException('The requested market symbol is invalid.');
    }

    const url = new URL('https://api.twelvedata.com/price');
    url.searchParams.set('symbol', normalizedSymbol);
    url.searchParams.set('apikey', apiKey);
    let response: Response;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    } catch {
      throw new ServiceUnavailableException('Market data provider is unavailable. Please retry.');
    }
    const body = await response.json() as TwelveDataPrice;
    const price = Number(body.price);
    if (!response.ok || !Number.isFinite(price)) {
      throw new ServiceUnavailableException(body.message ?? 'Market data is unavailable for this symbol.');
    }
    return { provider: 'twelve-data', symbol: normalizedSymbol, price, asOf: new Date().toISOString() };
  }
}
