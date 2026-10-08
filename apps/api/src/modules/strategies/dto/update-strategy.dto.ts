import { Transform, Type } from 'class-transformer';
import { IsArray, IsEnum, IsOptional, IsString, MaxLength, MinLength, ValidateIf, ValidateNested } from 'class-validator';
import { StrategyStatus } from '../entities/strategy.entity';
import { StrategyRuleDto } from './strategy-rule.dto';

export class UpdateStrategyDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @ValidateIf((_object, value) => value !== undefined) @IsString() @MinLength(3) @MaxLength(100) name?: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string | null;
  @IsOptional() @IsString() @MaxLength(32) timeframe?: string | null;
  @ValidateIf((_object, value) => value !== undefined) @IsEnum(StrategyStatus) status?: StrategyStatus;
  @ValidateIf((_object, value) => value !== undefined) @IsArray() @ValidateNested({ each: true }) @Type(() => StrategyRuleDto) rules?: StrategyRuleDto[];
}
