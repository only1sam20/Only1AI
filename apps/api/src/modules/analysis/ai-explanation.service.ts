import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type ExplanationRule = { id: string; category: string; condition: string };
export type ExplanationInput = {
  strategy: { name: string; timeframe: string | null };
  assessment: { score: number; outcome: 'qualified' | 'insufficient' };
  matchedRules: ExplanationRule[];
  unmatchedRules: ExplanationRule[];
  observations: { category: string; condition: string }[];
  marketContext: Record<string, unknown> | null;
};
export type AiExplanation = {
  provider: 'openai'; model: string; summary: string; limitations: string[];
  ruleReferences: string[]; generatedAt: string;
};

@Injectable()
export class AiExplanationService {
  constructor(private readonly config: ConfigService) {}

  async explain(input: ExplanationInput): Promise<AiExplanation> {
    const token = this.config.get<string>('AI_SERVICE_TOKEN')?.trim();
    if (!token) throw new ServiceUnavailableException('AI explanations are not configured for this workspace yet.');
    const payload = JSON.stringify(input);
    if (Buffer.byteLength(payload, 'utf8') > 60_000 || input.matchedRules.length + input.unmatchedRules.length > 100 || input.observations.length > 100) {
      throw new BadRequestException('This assessment is too large for an AI explanation. Use fewer rules or observations.');
    }
    if ([...input.matchedRules, ...input.unmatchedRules, ...input.observations].some((item) => !item.category.trim() || !item.condition.trim())) {
      throw new BadRequestException('Complete the rule categories and conditions, then evaluate this context again before requesting AI.');
    }
    const serviceUrl = this.config.get<string>('AI_SERVICE_URL') ?? 'http://localhost:8000';
    let url: URL;
    try {
      url = new URL('/v1/explain', serviceUrl);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Invalid URL');
    } catch {
      throw new ServiceUnavailableException('AI explanations are not configured for this workspace yet.');
    }
    try {
      const response = await fetch(url, {
        method: 'POST', redirect: 'error',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: payload, signal: AbortSignal.timeout(50_000),
      });
      if (!response.ok) throw new Error('AI service unavailable');
      const text = await response.text();
      if (text.length > 30_000) throw new Error('Invalid AI response');
      const result: unknown = JSON.parse(text);
      return this.validateExplanation(result, input);
    } catch {
      // Never relay provider/internal response bodies: they can contain secrets
      // or unsupported claims. Only validated evidence is saved to the product.
      throw new ServiceUnavailableException('AI could not explain this assessment. Your evidence has been kept; please retry or save a standard explanation.');
    }
  }

  private validateExplanation(value: unknown, input: ExplanationInput): AiExplanation {
    if (!value || typeof value !== 'object') throw new Error('Invalid AI response');
    const result = value as Record<string, unknown>;
    const strings = (items: unknown, limit: number, length: number): items is string[] => Array.isArray(items)
      && items.length <= limit && items.every((item: unknown) => typeof item === 'string' && item.trim().length > 0 && item.length <= length);
    if (result.provider !== 'openai' || typeof result.model !== 'string' || !result.model.trim() || result.model.length > 100
      || typeof result.summary !== 'string' || !result.summary.trim() || result.summary.length > 8_000
      || !strings(result.limitations, 10, 1_000) || !strings(result.ruleReferences, 100, 100)
      || typeof result.generatedAt !== 'string' || !Number.isFinite(Date.parse(result.generatedAt))) throw new Error('Invalid AI response');
    const allowedIds = new Set([...input.matchedRules, ...input.unmatchedRules].map((rule) => rule.id));
    if (new Set(result.ruleReferences).size !== result.ruleReferences.length || result.ruleReferences.some((id) => !allowedIds.has(id))) throw new Error('Unknown or duplicate evidence reference');
    return {
      provider: 'openai', model: result.model, summary: result.summary.trim(),
      limitations: result.limitations, ruleReferences: [...new Set(result.ruleReferences)], generatedAt: result.generatedAt,
    };
  }
}
