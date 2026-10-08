import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { AiExplanationService, ExplanationInput } from './ai-explanation.service';

const input: ExplanationInput = {
  strategy: { name: 'London study', timeframe: '15m' },
  assessment: { score: 50, outcome: 'insufficient' },
  matchedRules: [{ id: 'rule-1', category: 'session', condition: 'London' }],
  unmatchedRules: [{ id: 'rule-2', category: 'structure', condition: 'Higher high' }],
  observations: [{ category: 'session', condition: 'London' }], marketContext: null,
};
const validResponse = {
  provider: 'openai', model: 'gpt-5-mini', summary: 'The session matches; structure is unconfirmed.',
  limitations: ['User-supplied context has not been independently verified.'],
  ruleReferences: ['rule-1'], generatedAt: '2026-10-08T10:00:00.000Z',
};

describe('AiExplanationService', () => {
  const values: Record<string, string> = { AI_SERVICE_TOKEN: 'server-secret', AI_SERVICE_URL: 'http://localhost:8000' };
  const config = { get: jest.fn((key: string) => values[key]) };
  const originalFetch = global.fetch;
  const fetchMock = jest.fn();
  beforeEach(() => { fetchMock.mockReset(); global.fetch = fetchMock; config.get.mockImplementation((key: string) => values[key]); });
  afterAll(() => { global.fetch = originalFetch; });

  it('sends only assessment evidence and uses the private bearer credential', async () => {
    fetchMock.mockResolvedValue({ ok: true, text: async () => JSON.stringify(validResponse) });
    await expect(new AiExplanationService(config as never).explain(input)).resolves.toEqual(validResponse);
    expect(fetchMock).toHaveBeenCalledWith(new URL('http://localhost:8000/v1/explain'), expect.objectContaining({
      method: 'POST', redirect: 'error', body: JSON.stringify(input),
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer server-secret' },
    }));
  });

  it('does not make provider requests without private service configuration', async () => {
    config.get.mockReturnValue('');
    await expect(new AiExplanationService(config as never).explain(input)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects unknown evidence references before an explanation can be saved', async () => {
    fetchMock.mockResolvedValue({ ok: true, text: async () => JSON.stringify({ ...validResponse, ruleReferences: ['invented-rule'] }) });
    await expect(new AiExplanationService(config as never).explain(input)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('rejects repeated references instead of silently accepting malformed output', async () => {
    fetchMock.mockResolvedValue({ ok: true, text: async () => JSON.stringify({ ...validResponse, ruleReferences: ['rule-1', 'rule-1'] }) });
    await expect(new AiExplanationService(config as never).explain(input)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('does not expose service credentials or provider failure bodies', async () => {
    fetchMock.mockResolvedValue({ ok: false, text: async () => 'failure containing server-secret' });
    await expect(new AiExplanationService(config as never).explain(input)).rejects.toThrow('AI could not explain this assessment');
    await expect(new AiExplanationService(config as never).explain(input)).rejects.not.toThrow('server-secret');
  });

  it('bounds evidence payloads before calling an external model', async () => {
    await expect(new AiExplanationService(config as never).explain({ ...input, observations: Array.from({ length: 101 }, () => input.observations[0]) })).rejects.toBeInstanceOf(BadRequestException);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
