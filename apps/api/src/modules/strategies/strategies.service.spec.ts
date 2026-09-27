import { StrategiesService } from './strategies.service';

describe('StrategiesService', () => {
  it('does not create a strategy on another user’s Only1Core', async () => {
    const service = new StrategiesService({} as never, {} as never, { exists: jest.fn().mockResolvedValue(false) } as never, {} as never, {} as never);
    await expect(service.create('user-1', { only1CoreId: '00000000-0000-0000-0000-000000000002', name: 'Breakout' })).rejects.toThrow('Only1Core not found');
  });

  it('returns anonymous community strategy suggestions', async () => {
    const suggestions = { find: jest.fn().mockResolvedValue([{ name: 'Liquidity sweep' }, { name: 'Session breakout' }]) };
    const service = new StrategiesService({} as never, {} as never, {} as never, {} as never, suggestions as never);

    await expect(service.listSuggestions()).resolves.toEqual({ suggestions: ['Liquidity sweep', 'Session breakout'] });
    expect(suggestions.find).toHaveBeenCalledWith({
      select: { name: true },
      order: { normalizedName: 'ASC' },
      take: 100,
    });
  });
});
