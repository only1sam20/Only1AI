import { Transform } from 'class-transformer';
import { IsInt, IsObject, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class StrategyRuleDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(1) @MaxLength(48) category!: string;
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(1) @MaxLength(120) condition!: string;
  @IsOptional() @IsObject() value?: Record<string, unknown>;
  @IsOptional() @IsInt() @Min(1) @Max(100) priority?: number;
}
