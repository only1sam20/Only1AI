import { Body, Controller, Get, Patch, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthenticatedUser } from '../../common/authenticated-user.interface';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}
  @Get('me') @ApiOkResponse({ description: 'Current user and profile.' })
  me(@Req() request: Request & { user: AuthenticatedUser }) { return this.users.getMe(request.user.id); }
  @Patch('me/profile')
  updateProfile(@Req() request: Request & { user: AuthenticatedUser }, @Body() dto: UpdateProfileDto) { return this.users.updateProfile(request.user.id, dto); }
}
