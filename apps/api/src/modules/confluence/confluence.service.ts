import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StrategyRule } from '../strategies/entities/strategy-rule.entity';
import { Strategy } from '../strategies/entities/strategy.entity';
import { MarketMonitor } from '../market-scanner/entities/market-monitor.entity';
import { EvaluateConfluenceDto } from './dto/evaluate-confluence.dto';
import { ConfluenceAssessment, ConfluenceOutcome } from './entities/confluence-assessment.entity';
@Injectable()
export class ConfluenceService {
  constructor(@InjectRepository(ConfluenceAssessment) private readonly assessments: Repository<ConfluenceAssessment>, @InjectRepository(Strategy) private readonly strategies: Repository<Strategy>, @InjectRepository(StrategyRule) private readonly rules: Repository<StrategyRule>, @InjectRepository(MarketMonitor) private readonly monitors: Repository<MarketMonitor>) {}
  async evaluate(userId: string, dto: EvaluateConfluenceDto) {
    const strategy = await this.strategies.findOneBy({ id: dto.strategyId, userId }); if (!strategy) throw new NotFoundException('Strategy not found.');
    if (dto.monitorId) {
      const monitor = await this.monitors.findOneBy({ id: dto.monitorId, userId });
      if (!monitor) throw new NotFoundException('Market monitor not found.');
      if (monitor.only1CoreId !== strategy.only1CoreId || (monitor.strategyId && monitor.strategyId !== strategy.id)) throw new BadRequestException('Market monitor does not match this strategy.');
    }
    const rules = await this.rules.findBy({ strategyId: strategy.id });
    const observed = new Set(dto.observations.map((o) => `${o.category.trim().toLowerCase()}::${o.condition.trim().toLowerCase()}`));
    const matched = rules.filter((rule) => observed.has(`${rule.category.toLowerCase()}::${rule.condition.toLowerCase()}`));
    const total = rules.reduce((sum, rule) => sum + rule.priority, 0);
    const score = total ? Math.round((matched.reduce((sum, rule) => sum + rule.priority, 0) / total) * 100) : 0;
    const matchedIds = new Set(matched.map((rule) => rule.id));
    const ruleSnapshot = rules.map((rule) => ({ id: rule.id, category: rule.category, condition: rule.condition, priority: rule.priority, matched: matchedIds.has(rule.id) }));
    const strategySnapshot = { name: strategy.name, timeframe: strategy.timeframe?.trim() || null };
    return this.assessments.save(this.assessments.create({ userId, only1CoreId: strategy.only1CoreId, strategyId: strategy.id, monitorId: dto.monitorId ?? null, score, matchedRuleIds: [...matchedIds], ruleSnapshot, strategySnapshot, observations: dto.observations as unknown as Record<string, unknown>[], outcome: score >= 70 ? ConfluenceOutcome.QUALIFIED : ConfluenceOutcome.INSUFFICIENT }));
  }
  list(userId: string) { return this.assessments.find({ where: { userId }, order: { createdAt: 'DESC' }, take: 50 }); }
}
