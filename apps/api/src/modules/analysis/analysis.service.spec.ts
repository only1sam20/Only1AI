import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AnalysisService } from './analysis.service';

describe('AnalysisService', () => {
  const saved = { create: jest.fn((value) => value), save: jest.fn(async (value) => value) };
  const assessments = { findOneBy: jest.fn() };
  const strategies = { findOneBy: jest.fn() };
  const ai = { explain: jest.fn() };
  const service = new AnalysisService(saved as never, assessments as never, strategies as never, ai as never);
  beforeEach(() => jest.resetAllMocks());

  it('includes a non-advisory disclaimer in standard explanations', async () => {
    saved.create.mockImplementation((value) => value);
    saved.save.mockImplementation(async (value) => value);
    assessments.findOneBy.mockResolvedValue({ strategyId: 's', strategySnapshot: { name: 'Test', timeframe: null }, score: 50, ruleSnapshot: [], outcome: 'insufficient' });
    strategies.findOneBy.mockResolvedValue({ name: 'Test' });
    await expect(service.generate('u', 'a')).resolves.toMatchObject({ summary: expect.stringContaining('not trading advice') });
  });

  it('checks assessment ownership before calling AI', async () => {
    assessments.findOneBy.mockResolvedValue(null);
    await expect(service.generateWithAi('owner', 'another-users-assessment')).rejects.toBeInstanceOf(NotFoundException);
    expect(assessments.findOneBy).toHaveBeenCalledWith({ id: 'another-users-assessment', userId: 'owner' });
    expect(ai.explain).not.toHaveBeenCalled();
    expect(saved.save).not.toHaveBeenCalled();
  });

  it('explains the preserved rules even if a strategy has since been edited', async () => {
    saved.create.mockImplementation((value) => value);
    saved.save.mockImplementation(async (value) => value);
    assessments.findOneBy.mockResolvedValue({
      strategyId: 's', score: 100, outcome: 'qualified', observations: [{ category: 'session', condition: 'London' }],
      strategySnapshot: { name: 'Original study', timeframe: ' ' },
      ruleSnapshot: [{ id: 'r1', category: 'session', condition: 'London', priority: 80, matched: true }],
    });
    strategies.findOneBy.mockResolvedValue({ id: 's', name: 'Edited study', timeframe: '4h' });
    ai.explain.mockResolvedValue({ provider: 'openai', model: 'gpt-5-mini', summary: 'Session matches the provided observation.', limitations: ['Manual evidence.'], ruleReferences: ['r1'], generatedAt: '2026-10-08T10:00:00Z' });
    await expect(service.generateWithAi('u', 'a')).resolves.toMatchObject({
      summary: expect.stringContaining('not trading advice'),
      evidence: { provider: 'openai', score: 100, contextSource: 'manual', ruleReferences: ['r1'] },
    });
    expect(ai.explain).toHaveBeenCalledWith(expect.objectContaining({ strategy: { name: 'Original study', timeframe: null }, matchedRules: [{ id: 'r1', category: 'session', condition: 'London' }], marketContext: null }));
  });

  it('requires older assessments to be evaluated again instead of inventing historic rules', async () => {
    assessments.findOneBy.mockResolvedValue({ strategyId: 's', ruleSnapshot: null });
    strategies.findOneBy.mockResolvedValue({ id: 's', name: 'Study' });
    await expect(service.generateWithAi('u', 'a')).rejects.toBeInstanceOf(BadRequestException);
    expect(ai.explain).not.toHaveBeenCalled();
  });

  it('uses historic matches in standard explanations after strategy edits', async () => {
    saved.create.mockImplementation((value) => value);
    saved.save.mockImplementation(async (value) => value);
    assessments.findOneBy.mockResolvedValue({
      strategyId: 's', score: 100, outcome: 'qualified',
      strategySnapshot: { name: 'Original study', timeframe: '15m' },
      ruleSnapshot: [{ id: 'historic-rule', category: 'session', condition: 'London', priority: 80, matched: true }],
    });
    strategies.findOneBy.mockResolvedValue({ id: 's', name: 'Edited study' });
    await expect(service.generate('u', 'a')).resolves.toMatchObject({
      summary: expect.stringContaining('1 rule matched'),
      title: 'Original study confluence review',
      evidence: { matchedRules: [{ id: 'historic-rule', category: 'session', condition: 'London' }], unmatchedRules: [] },
    });
  });

  it('rejects standard generation without historic rules instead of mismatching evidence', async () => {
    assessments.findOneBy.mockResolvedValue({ strategyId: 's', ruleSnapshot: null });
    strategies.findOneBy.mockResolvedValue({ id: 's', name: 'Edited study' });
    await expect(service.generate('u', 'a')).rejects.toBeInstanceOf(BadRequestException);
    expect(saved.save).not.toHaveBeenCalled();
  });
});
