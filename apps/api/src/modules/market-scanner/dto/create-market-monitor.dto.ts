import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { MarketType, MonitorStatus } from '../entities/market-monitor.entity';

export class CreateMarketMonitorDto {
  @IsUUID() only1CoreId!: string;
  @IsOptional() @IsUUID() strategyId?: string;
  @IsString() @MaxLength(32) symbol!: string;
  @IsEnum(MarketType) marketType!: MarketType;
  @IsString() @MaxLength(32) timeframe!: string;
  @IsOptional() @IsEnum(MonitorStatus) status?: MonitorStatus;
}
