import { ConfluenceService } from './confluence.service';

describe('ConfluenceService', () => {
  it('scores matched rules without issuing a trade instruction', async () => {
    const assessments = { create: jest.fn((value) => value), save: jest.fn((value) => Promise.resolve(value)) };
    const service = new ConfluenceService(
      assessments as never,
      { findOneBy: jest.fn().mockResolvedValue({ id: 's', only1CoreId: 'c', name: 'London session', timeframe: '15m' }) } as never,
      { findBy: jest.fn().mockResolvedValue([{ id: 'r', category: 'session', condition: 'London', priority: 80 }]) } as never,
      {} as never,
    );
    await expect(service.evaluate('u', { strategyId: 's', observations: [{ category: 'session', condition: 'London' }] })).resolves.toMatchObject({
      score: 100, outcome: 'qualified',
      ruleSnapshot: [{ id: 'r', category: 'session', condition: 'London', priority: 80, matched: true }],
      strategySnapshot: { name: 'London session', timeframe: '15m' },
    });
  });
});
