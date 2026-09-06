import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { MonitorStatus } from '../entities/market-monitor.entity';

export class UpdateMarketMonitorDto {
  @IsOptional() @IsString() @MaxLength(32) timeframe?: string;
  @IsOptional() @IsEnum(MonitorStatus) status?: MonitorStatus;
}
