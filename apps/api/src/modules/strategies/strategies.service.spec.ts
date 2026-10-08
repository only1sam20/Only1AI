import { StrategiesService } from './strategies.service';
import { Strategy, StrategyStatus } from './entities/strategy.entity';
import { StrategyRule } from './entities/strategy-rule.entity';

const existingStrategy = () => ({
  id: 'strategy-1', userId: 'user-1', only1CoreId: 'core-1', name: 'Old name',
  description: 'Old description', timeframe: '15min', status: StrategyStatus.DRAFT,
});

function updateService() {
  const rules = [{ id: 'rule-1', strategyId: 'strategy-1', category: 'Trend', condition: 'Bullish', priority: 50 }];
  const manager = {
    merge: jest.fn((_entity: unknown, current: Record<string, unknown>, changes: Record<string, unknown>) => ({ ...current, ...Object.fromEntries(Object.entries(changes).filter(([, value]) => value !== undefined)) })),
    create: jest.fn((_entity: unknown, value: Record<string, unknown>) => value),
    save: jest.fn(async (_entity: unknown, value: unknown) => value),
    delete: jest.fn(),
  };
  const dataSource = {
    transaction: jest.fn(async (work: (transaction: typeof manager) => Promise<unknown>) => work(manager)),
  };
  const service = new StrategiesService(
    { findOneBy: jest.fn().mockResolvedValue(existingStrategy()) } as never,
    { find: jest.fn().mockResolvedValue(rules) } as never,
    {} as never, dataSource as never, {} as never,
  );
  return { service, manager, rules };
}

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

  it('returns the saved metadata while preserving rules when rules are omitted', async () => {
    const { service, manager, rules } = updateService();

    await expect(service.update('user-1', 'strategy-1', { name: '  Updated name  ', status: StrategyStatus.ACTIVE })).resolves.toMatchObject({
      name: 'Updated name', status: StrategyStatus.ACTIVE, rules,
    });
    expect(manager.save).toHaveBeenCalledWith(Strategy, expect.objectContaining({ name: 'Updated name' }));
    expect(manager.delete).not.toHaveBeenCalled();
  });

  it.each([null, '', '   '])('clears nullable strategy metadata with %p', async (value) => {
    const { service } = updateService();
    await expect(service.update('user-1', 'strategy-1', { description: value, timeframe: value })).resolves.toMatchObject({
      description: null, timeframe: null, name: 'Old name',
    });
  });

  it('replaces rules only when a rules array is explicitly supplied', async () => {
    const { service, manager } = updateService();
    await expect(service.update('user-1', 'strategy-1', { rules: [] })).resolves.toMatchObject({ rules: [] });
    expect(manager.delete).toHaveBeenCalledWith(StrategyRule, { strategyId: 'strategy-1' });
  });
});
