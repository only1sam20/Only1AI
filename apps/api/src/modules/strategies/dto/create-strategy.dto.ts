import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { StrategyStatus } from '../entities/strategy.entity';
import { StrategyRuleDto } from './strategy-rule.dto';

export class CreateStrategyDto {
  @IsUUID() only1CoreId!: string;
  @IsString() @MinLength(3) @MaxLength(100) name!: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsString() @MaxLength(32) timeframe?: string;
  @IsOptional() @IsEnum(StrategyStatus) status?: StrategyStatus;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => StrategyRuleDto) rules?: StrategyRuleDto[];
}
