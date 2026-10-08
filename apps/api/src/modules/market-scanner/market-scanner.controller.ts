import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthenticatedUser } from '../../common/authenticated-user.interface';
import { CreateMarketMonitorDto } from './dto/create-market-monitor.dto';
import { UpdateMarketMonitorDto } from './dto/update-market-monitor.dto';
import { MarketScannerService } from './market-scanner.service';

@ApiTags('market-scanner') @ApiBearerAuth() @Controller('market-monitors')
export class MarketScannerController {
  constructor(private readonly scanner: MarketScannerService) {}
  @Get() list(@Req() request: Request & { user: AuthenticatedUser }) { return this.scanner.list(request.user.id); }
  @Get('capabilities') capabilities() { return this.scanner.capabilities(); }
  @Get(':id/candles') candles(@Req() request: Request & { user: AuthenticatedUser }, @Param('id', new ParseUUIDPipe()) id: string) { return this.scanner.candles(request.user.id, id); }
  @Get('snapshot/:symbol') snapshot(@Param('symbol') symbol: string) { return this.scanner.snapshot(symbol); }
  @Post() create(@Req() request: Request & { user: AuthenticatedUser }, @Body() dto: CreateMarketMonitorDto) { return this.scanner.create(request.user.id, dto); }
  @Patch(':id') update(@Req() request: Request & { user: AuthenticatedUser }, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateMarketMonitorDto) { return this.scanner.update(request.user.id, id, dto); }
}
