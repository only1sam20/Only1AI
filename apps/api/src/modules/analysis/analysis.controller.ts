import { Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthenticatedUser } from '../../common/authenticated-user.interface';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { AnalysisService } from './analysis.service';

@ApiTags('analysis') @ApiBearerAuth() @Controller('analyses')
export class AnalysisController {
  constructor(private readonly analysis: AnalysisService) {}
  @Get() list(@Req() request: Request & { user: AuthenticatedUser }, @Query() page: PaginationQueryDto) { return this.analysis.list(request.user.id, page); }
  @Post('from-assessment/:assessmentId') generate(@Req() request: Request & { user: AuthenticatedUser }, @Param('assessmentId') id: string) { return this.analysis.generate(request.user.id, id); }
}
