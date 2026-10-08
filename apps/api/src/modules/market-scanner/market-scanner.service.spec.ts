import { MarketScannerService } from './market-scanner.service';

describe('MarketScannerService', () => {
  it('rejects monitors for another user core', async () => {
    const service = new MarketScannerService({} as never, { exists: jest.fn().mockResolvedValue(false) } as never, {} as never, {} as never);
    await expect(service.create('u', { only1CoreId: '00000000-0000-0000-0000-000000000001', symbol: 'EUR/USD', marketType: 'forex' as never, timeframe: '15m' })).rejects.toThrow('Only1Core not found');
  });
  it('checks monitor ownership before requesting provider candles', async () => {
    const monitors = { findOneBy: jest.fn().mockResolvedValue(null) };
    const marketData = { candles: jest.fn() };
    const service = new MarketScannerService(monitors as never, {} as never, {} as never, marketData as never);
    await expect(service.candles('user-a', 'other-user-monitor')).rejects.toThrow('Market monitor not found');
    expect(monitors.findOneBy).toHaveBeenCalledWith({ id: 'other-user-monitor', userId: 'user-a' });
    expect(marketData.candles).not.toHaveBeenCalled();
  });
  it('loads candles using owned monitor configuration rather than client supplied symbols', async () => {
    const monitors = { findOneBy: jest.fn().mockResolvedValue({ symbol: 'EUR/USD', timeframe: '15m' }) };
    const marketData = { candles: jest.fn().mockResolvedValue({ provider: 'twelve-data' }) };
    const service = new MarketScannerService(monitors as never, {} as never, {} as never, marketData as never);
    await expect(service.candles('user-a', 'monitor-a')).resolves.toEqual({ provider: 'twelve-data' });
    expect(marketData.candles).toHaveBeenCalledWith('EUR/USD', '15m');
  });
});
