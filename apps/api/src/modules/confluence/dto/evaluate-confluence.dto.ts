import { Type } from 'class-transformer';
import { IsArray, IsObject, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
class ObservationDto { @IsString() category!: string; @IsString() condition!: string; @IsOptional() @IsObject() value?: Record<string, unknown>; }
export class EvaluateConfluenceDto { @IsUUID() strategyId!: string; @IsOptional() @IsUUID() monitorId?: string; @IsArray() @ValidateNested({ each: true }) @Type(() => ObservationDto) observations!: ObservationDto[]; }
