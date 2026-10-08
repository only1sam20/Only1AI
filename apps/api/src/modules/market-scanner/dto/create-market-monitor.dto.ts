import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, ValidateIf } from 'class-validator';
import { MarketType, MonitorStatus } from '../entities/market-monitor.entity';

export class CreateMarketMonitorDto {
  @IsUUID() only1CoreId!: string;
  @IsOptional() @IsUUID() strategyId?: string;
  @IsString() @MaxLength(32) symbol!: string;
  @IsEnum(MarketType) marketType!: MarketType;
  @IsString() @MaxLength(32) timeframe!: string;
  @ValidateIf((_object, value) => value !== undefined) @IsEnum(MonitorStatus) status?: MonitorStatus;
}
