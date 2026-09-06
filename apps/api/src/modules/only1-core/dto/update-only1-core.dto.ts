import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { Only1CoreStatus } from '../entities/only1-core.entity';

export class UpdateOnly1CoreDto {
  @IsOptional() @IsString() @MinLength(3) @MaxLength(80) name?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsEnum(Only1CoreStatus) status?: Only1CoreStatus;
  @IsOptional() @IsInt() @Min(5) @Max(1440) analysisIntervalMinutes?: number;
}
