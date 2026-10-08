import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Only1Core } from '../only1-core/entities/only1-core.entity';
import { Strategy } from '../strategies/entities/strategy.entity';
import { CreateMarketMonitorDto } from './dto/create-market-monitor.dto';
import { UpdateMarketMonitorDto } from './dto/update-market-monitor.dto';
import { MarketMonitor, MonitorStatus } from './entities/market-monitor.entity';
import { MarketDataService, normalizeMarketSymbol, normalizeTimeframe } from './market-data.service';

@Injectable()
export class MarketScannerService {
  constructor(@InjectRepository(MarketMonitor) private readonly monitors: Repository<MarketMonitor>, @InjectRepository(Only1Core) private readonly cores: Repository<Only1Core>, @InjectRepository(Strategy) private readonly strategies: Repository<Strategy>, private readonly marketData: MarketDataService) {}
  list(userId: string) { return this.monitors.find({ where: { userId }, order: { updatedAt: 'DESC' } }); }
  snapshot(symbol: string) {
    return this.marketData.snapshot(symbol);
  }
  capabilities() { return this.marketData.capabilities(); }
  async candles(userId: string, id: string) {
    const monitor = await this.monitors.findOneBy({ id, userId });
    if (!monitor) throw new NotFoundException('Market monitor not found.');
    return this.marketData.candles(monitor.symbol, monitor.timeframe);
  }
  async create(userId: string, dto: CreateMarketMonitorDto) {
    if (!await this.cores.exists({ where: { id: dto.only1CoreId, userId } })) throw new NotFoundException('Only1Core not found.');
    if (dto.strategyId && !await this.strategies.exists({ where: { id: dto.strategyId, userId, only1CoreId: dto.only1CoreId } })) throw new NotFoundException('Strategy not found for this Only1Core.');
    return this.monitors.save(this.monitors.create({ userId, only1CoreId: dto.only1CoreId, strategyId: dto.strategyId ?? null, symbol: normalizeMarketSymbol(dto.symbol), marketType: dto.marketType, timeframe: normalizeTimeframe(dto.timeframe), status: dto.status ?? MonitorStatus.PAUSED }));
  }
  async update(userId: string, id: string, dto: UpdateMarketMonitorDto) {
    const monitor = await this.monitors.findOneBy({ id, userId });
    if (!monitor) throw new NotFoundException('Market monitor not found.');
    const timeframe = dto.timeframe === undefined ? monitor.timeframe : normalizeTimeframe(dto.timeframe);
    Object.assign(monitor, dto, { timeframe });
    return this.monitors.save(monitor);
  }
}
