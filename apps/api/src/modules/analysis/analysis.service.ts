import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ConfluenceAssessment } from '../confluence/entities/confluence-assessment.entity';
import { Strategy } from '../strategies/entities/strategy.entity';
import { Analysis } from './entities/analysis.entity';
import { AiExplanationService, ExplanationRule } from './ai-explanation.service';

@Injectable()
export class AnalysisService {
  constructor(@InjectRepository(Analysis) private readonly analyses: Repository<Analysis>, @InjectRepository(ConfluenceAssessment) private readonly assessments: Repository<ConfluenceAssessment>, @InjectRepository(Strategy) private readonly strategies: Repository<Strategy>, private readonly ai: AiExplanationService) {}
  async generate(userId: string, assessmentId: string) {
    const assessment = await this.assessments.findOneBy({ id: assessmentId, userId });
    if (!assessment) throw new NotFoundException('Confluence assessment not found.');
    const strategy = await this.strategies.findOneBy({ id: assessment.strategyId, userId });
    if (!strategy) throw new NotFoundException('Strategy not found.');
    if (!assessment.ruleSnapshot || !assessment.strategySnapshot) throw new BadRequestException('Evaluate this context again to preserve the exact rules before saving an explanation.');
    const rules = assessment.ruleSnapshot;
    const matched = rules.filter((rule) => rule.matched);
    const unmatched = rules.filter((rule) => !rule.matched);
    const summary = `${assessment.score}% of the weighted confluence rules for “${assessment.strategySnapshot.name}” matched the supplied context. ${matched.length} rule${matched.length === 1 ? '' : 's'} matched and ${unmatched.length} did not. This is an explanation of configured confluence, not trading advice.`;
    return this.analyses.save(this.analyses.create({ userId, assessmentId, title: `${assessment.strategySnapshot.name} confluence review`, summary, evidence: { score: assessment.score, outcome: assessment.outcome, matchedRules: matched.map((rule) => ({ id: rule.id, category: rule.category, condition: rule.condition })), unmatchedRules: unmatched.map((rule) => ({ id: rule.id, category: rule.category, condition: rule.condition })) } }));
  }
  async generateWithAi(userId: string, assessmentId: string) {
    const assessment = await this.assessments.findOneBy({ id: assessmentId, userId });
    if (!assessment) throw new NotFoundException('Confluence assessment not found.');
    const strategy = await this.strategies.findOneBy({ id: assessment.strategyId, userId });
    if (!strategy) throw new NotFoundException('Strategy not found.');
    if (!assessment.ruleSnapshot || !assessment.strategySnapshot) throw new BadRequestException('Evaluate this context again before requesting AI, so the exact rules are preserved with the assessment.');
    const ruleEvidence = (rule: ExplanationRule) => ({ id: rule.id, category: rule.category, condition: rule.condition });
    const matchedRules = assessment.ruleSnapshot.filter((rule) => rule.matched).map(ruleEvidence);
    const unmatchedRules = assessment.ruleSnapshot.filter((rule) => !rule.matched).map(ruleEvidence);
    const observations = assessment.observations.map((observation) => ({
      category: String(observation.category ?? ''), condition: String(observation.condition ?? ''),
    }));
    const explanation = await this.ai.explain({
      strategy: { name: assessment.strategySnapshot.name, timeframe: assessment.strategySnapshot.timeframe?.trim() || null },
      assessment: { score: assessment.score, outcome: assessment.outcome },
      matchedRules, unmatchedRules, observations, marketContext: null,
    });
    return this.analyses.save(this.analyses.create({
      userId, assessmentId, title: `${assessment.strategySnapshot.name} AI confluence review`.slice(0, 160),
      summary: `${explanation.summary}\n\nThis explains supplied confluence evidence; it is not trading advice.`,
      evidence: {
        score: assessment.score, outcome: assessment.outcome, matchedRules, unmatchedRules,
        provider: explanation.provider, model: explanation.model,
        limitations: explanation.limitations, ruleReferences: explanation.ruleReferences,
        generatedAt: explanation.generatedAt, contextSource: 'manual',
      },
    }));
  }

  list(userId: string, page: PaginationQueryDto) { return this.analyses.find({ where: { userId }, order: { createdAt: 'DESC' }, take: page.limit, skip: page.offset }); }
}
