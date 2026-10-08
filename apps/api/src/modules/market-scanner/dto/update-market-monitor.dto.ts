import { IsEnum, IsString, MaxLength, ValidateIf } from 'class-validator';
import { MonitorStatus } from '../entities/market-monitor.entity';

export class UpdateMarketMonitorDto {
  @ValidateIf((_object, value) => value !== undefined) @IsString() @MaxLength(32) timeframe?: string;
  @ValidateIf((_object, value) => value !== undefined) @IsEnum(MonitorStatus) status?: MonitorStatus;
}
