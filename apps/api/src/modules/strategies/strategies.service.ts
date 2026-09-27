import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Only1Core } from '../only1-core/entities/only1-core.entity';
import { CreateStrategyDto } from './dto/create-strategy.dto';
import { UpdateStrategyDto } from './dto/update-strategy.dto';
import { StrategyRule } from './entities/strategy-rule.entity';
import { Strategy, StrategyStatus } from './entities/strategy.entity';
import { StrategySuggestion } from './entities/strategy-suggestion.entity';

@Injectable()
export class StrategiesService {
  constructor(
    @InjectRepository(Strategy) private readonly strategies: Repository<Strategy>,
    @InjectRepository(StrategyRule) private readonly rules: Repository<StrategyRule>,
    @InjectRepository(Only1Core) private readonly cores: Repository<Only1Core>,
    private readonly dataSource: DataSource,
    @InjectRepository(StrategySuggestion) private readonly suggestions: Repository<StrategySuggestion>,
  ) {}

  async list(userId: string) { return this.strategies.find({ where: { userId }, order: { updatedAt: 'DESC' } }); }

  async listSuggestions(): Promise<{ suggestions: string[] }> {
    const suggestions = await this.suggestions.find({
      select: { name: true },
      order: { normalizedName: 'ASC' },
      take: 100,
    });
    return { suggestions: suggestions.map((suggestion) => suggestion.name) };
  }

  async get(userId: string, id: string) {
    const strategy = await this.strategies.findOneBy({ id, userId });
    if (!strategy) throw new NotFoundException('Strategy not found.');
    return { ...strategy, rules: await this.rules.find({ where: { strategyId: id }, order: { priority: 'DESC', createdAt: 'ASC' } }) };
  }

  async create(userId: string, dto: CreateStrategyDto) {
    await this.requireCore(userId, dto.only1CoreId);
    return this.dataSource.transaction(async (manager) => {
      const strategy = await manager.save(Strategy, manager.create(Strategy, {
        userId, only1CoreId: dto.only1CoreId, name: dto.name.trim(), description: dto.description?.trim() ?? null,
        timeframe: dto.timeframe?.trim() ?? null, status: dto.status ?? StrategyStatus.DRAFT,
      }));
      const rules = dto.rules?.length ? await manager.save(StrategyRule, dto.rules.map((rule) => manager.create(StrategyRule, { strategyId: strategy.id, category: rule.category.trim(), condition: rule.condition.trim(), value: rule.value ?? null, priority: rule.priority ?? 50 }))) : [];
      return { ...strategy, rules };
    });
  }

  async update(userId: string, id: string, dto: UpdateStrategyDto) {
    const current = await this.get(userId, id);
    return this.dataSource.transaction(async (manager) => {
      const strategy = manager.merge(Strategy, current, {
        ...dto, name: dto.name?.trim(), description: dto.description === undefined ? current.description : dto.description.trim() || null,
        timeframe: dto.timeframe === undefined ? current.timeframe : dto.timeframe.trim() || null,
      });
      const saved = await manager.save(Strategy, strategy);
      if (dto.rules === undefined) return current;
      await manager.delete(StrategyRule, { strategyId: id });
      const rules = dto.rules.length ? await manager.save(StrategyRule, dto.rules.map((rule) => manager.create(StrategyRule, { strategyId: id, category: rule.category.trim(), condition: rule.condition.trim(), value: rule.value ?? null, priority: rule.priority ?? 50 }))) : [];
      return { ...saved, rules };
    });
  }

  private async requireCore(userId: string, coreId: string): Promise<void> {
    if (!await this.cores.exists({ where: { id: coreId, userId } })) throw new NotFoundException('Only1Core not found.');
  }
}
