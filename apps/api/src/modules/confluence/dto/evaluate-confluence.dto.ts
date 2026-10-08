import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsObject, IsOptional, IsString, IsUUID, MaxLength, MinLength, ValidateNested } from 'class-validator';
class ObservationDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(1) @MaxLength(48) category!: string;
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(1) @MaxLength(120) condition!: string;
  @IsOptional() @IsObject() value?: Record<string, unknown>;
}
export class EvaluateConfluenceDto {
  @IsUUID() strategyId!: string;
  @IsOptional() @IsUUID() monitorId?: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => ObservationDto) observations!: ObservationDto[];
}
