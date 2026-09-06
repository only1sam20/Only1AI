import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ConfluenceAssessment } from '../confluence/entities/confluence-assessment.entity';
import { StrategyRule } from '../strategies/entities/strategy-rule.entity';
import { Strategy } from '../strategies/entities/strategy.entity';
import { Analysis } from './entities/analysis.entity';

@Injectable()
export class AnalysisService {
  constructor(@InjectRepository(Analysis) private readonly analyses: Repository<Analysis>, @InjectRepository(ConfluenceAssessment) private readonly assessments: Repository<ConfluenceAssessment>, @InjectRepository(Strategy) private readonly strategies: Repository<Strategy>, @InjectRepository(StrategyRule) private readonly rules: Repository<StrategyRule>) {}
  async generate(userId: string, assessmentId: string) {
    const assessment = await this.assessments.findOneBy({ id: assessmentId, userId });
    if (!assessment) throw new NotFoundException('Confluence assessment not found.');
    const strategy = await this.strategies.findOneByOrFail({ id: assessment.strategyId, userId });
    const rules = await this.rules.findBy({ strategyId: strategy.id });
    const matched = rules.filter((rule) => assessment.matchedRuleIds.includes(rule.id));
    const unmatched = rules.filter((rule) => !assessment.matchedRuleIds.includes(rule.id));
    const summary = `${assessment.score}% of the weighted confluence rules for “${strategy.name}” matched the supplied context. ${matched.length} rule${matched.length === 1 ? '' : 's'} matched and ${unmatched.length} did not. This is an explanation of configured confluence, not trading advice.`;
    return this.analyses.save(this.analyses.create({ userId, assessmentId, title: `${strategy.name} confluence review`, summary, evidence: { score: assessment.score, outcome: assessment.outcome, matchedRules: matched.map((rule) => ({ id: rule.id, category: rule.category, condition: rule.condition })), unmatchedRules: unmatched.map((rule) => ({ id: rule.id, category: rule.category, condition: rule.condition })) } }));
  }
  list(userId: string, page: PaginationQueryDto) { return this.analyses.find({ where: { userId }, order: { createdAt: 'DESC' }, take: page.limit, skip: page.offset }); }
}
