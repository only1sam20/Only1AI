import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthenticatedUser } from '../../common/authenticated-user.interface';
import { CreateStrategyDto } from './dto/create-strategy.dto';
import { UpdateStrategyDto } from './dto/update-strategy.dto';
import { StrategiesService } from './strategies.service';
import { Public } from '../../common/public.decorator';

@ApiTags('strategies')
@ApiBearerAuth()
@Controller('strategies')
export class StrategiesController {
  constructor(private readonly strategies: StrategiesService) {}
  @Public()
  @Get('suggestions')
  @ApiOkResponse({ description: 'Distinct community strategy suggestions without user identities.' })
  suggestions() { return this.strategies.listSuggestions(); }
  @Get() list(@Req() request: Request & { user: AuthenticatedUser }) { return this.strategies.list(request.user.id); }
  @Get(':id') get(@Req() request: Request & { user: AuthenticatedUser }, @Param('id') id: string) { return this.strategies.get(request.user.id, id); }
  @Post() @ApiCreatedResponse({ description: 'Strategy with optional confluence rules.' })
  create(@Req() request: Request & { user: AuthenticatedUser }, @Body() dto: CreateStrategyDto) { return this.strategies.create(request.user.id, dto); }
  @Patch(':id')
  update(@Req() request: Request & { user: AuthenticatedUser }, @Param('id') id: string, @Body() dto: UpdateStrategyDto) { return this.strategies.update(request.user.id, id, dto); }
}
