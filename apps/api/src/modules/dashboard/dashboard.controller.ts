import { Controller, Get, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthenticatedUser } from '../../common/authenticated-user.interface';
import { DashboardService } from './dashboard.service';

@ApiTags('mission-control')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}
  @Get('mission-control')
  @ApiOkResponse({ description: 'Authenticated user dashboard and onboarding state.' })
  getMissionControl(@Req() request: Request & { user: AuthenticatedUser }) { return this.dashboard.missionControl(request.user.id); }
}
