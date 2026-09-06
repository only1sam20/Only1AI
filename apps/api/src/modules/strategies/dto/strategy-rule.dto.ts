import { IsInt, IsObject, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class StrategyRuleDto {
  @IsString() @MaxLength(48) category!: string;
  @IsString() @MaxLength(120) condition!: string;
  @IsOptional() @IsObject() value?: Record<string, unknown>;
  @IsOptional() @IsInt() @Min(1) @Max(100) priority?: number;
}
