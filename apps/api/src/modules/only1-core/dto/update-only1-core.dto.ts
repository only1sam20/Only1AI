import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';
import { Only1CoreStatus } from '../entities/only1-core.entity';

export class UpdateOnly1CoreDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @ValidateIf((_object, value) => value !== undefined) @IsString() @MinLength(3) @MaxLength(80) name?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string | null;
  @ValidateIf((_object, value) => value !== undefined) @IsEnum(Only1CoreStatus) status?: Only1CoreStatus;
  @ValidateIf((_object, value) => value !== undefined) @IsInt() @Min(5) @Max(1440) analysisIntervalMinutes?: number;
}
