import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthenticatedUser } from '../../common/authenticated-user.interface';
import { CreateOnly1CoreDto } from './dto/create-only1-core.dto';
import { UpdateOnly1CoreDto } from './dto/update-only1-core.dto';
import { Only1CoreService } from './only1-core.service';

@ApiTags('only1core')
@ApiBearerAuth()
@Controller('only1-cores')
export class Only1CoreController {
  constructor(private readonly cores: Only1CoreService) {}
  @Get() @ApiOkResponse({ description: 'The current user’s Only1Cores.' })
  list(@Req() request: Request & { user: AuthenticatedUser }) { return this.cores.listForUser(request.user.id); }
  @Get(':id') get(@Req() request: Request & { user: AuthenticatedUser }, @Param('id') id: string) { return this.cores.getForUser(request.user.id, id); }
  @Post() @ApiCreatedResponse({ description: 'Only1Core created in paused mode.' })
  create(@Req() request: Request & { user: AuthenticatedUser }, @Body() dto: CreateOnly1CoreDto) { return this.cores.create(request.user.id, dto); }
  @Patch(':id')
  update(@Req() request: Request & { user: AuthenticatedUser }, @Param('id') id: string, @Body() dto: UpdateOnly1CoreDto) { return this.cores.update(request.user.id, id, dto); }
}
