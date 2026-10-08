import { Controller, Get, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthenticatedUser } from '../../common/authenticated-user.interface';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { AnalysisService } from './analysis.service';

@ApiTags('analysis') @ApiBearerAuth() @Controller('analyses')
export class AnalysisController {
  constructor(private readonly analysis: AnalysisService) {}
  @Get() list(@Req() request: Request & { user: AuthenticatedUser }, @Query() page: PaginationQueryDto) { return this.analysis.list(request.user.id, page); }
  @Post('from-assessment/:assessmentId') generate(@Req() request: Request & { user: AuthenticatedUser }, @Param('assessmentId', ParseUUIDPipe) id: string) { return this.analysis.generate(request.user.id, id); }
  @Post('from-assessment/:assessmentId/ai')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  generateWithAi(@Req() request: Request & { user: AuthenticatedUser }, @Param('assessmentId', ParseUUIDPipe) id: string) { return this.analysis.generateWithAi(request.user.id, id); }
}
