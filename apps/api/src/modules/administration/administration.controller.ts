import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Req } from '@nestjs/common';
import { IsBoolean, IsEnum, ValidateIf } from 'class-validator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthenticatedUser } from '../../common/authenticated-user.interface';
import { Roles } from '../../common/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { AdministrationService } from './administration.service';

export class UpdateUserDto {
  @ValidateIf((_object, value) => value !== undefined) @IsEnum(UserRole) role?: UserRole;
  @ValidateIf((_object, value) => value !== undefined) @IsBoolean() isActive?: boolean;
}

@ApiTags('administration')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdministrationController {
  constructor(private readonly admin: AdministrationService) {}

  @Get('users')
  users() { return this.admin.listUsers(); }

  @Patch('users/:id')
  update(@Req() request: Request & { user: AuthenticatedUser }, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) {
    return this.admin.updateUser(request.user.id, id, dto);
  }

  @Get('audit-logs')
  audit() { return this.admin.listAudit(); }
}
