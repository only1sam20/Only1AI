import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { Public } from '../../common/public.decorator';

const REFRESH_COOKIE = 'only1ai_refresh';

@ApiTags('authentication')
@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @HttpCode(202)
  @ApiOkResponse({ description: 'Registration accepted. Verify the email address to continue.' })
  async register(@Body() dto: RegisterDto): Promise<{ message: string }> {
    await this.auth.register(dto.email, dto.password);
    return { message: 'If registration succeeds, check your email for verification instructions.' };
  }

  @Post('verify-email')
  @HttpCode(204)
  @ApiNoContentResponse({ description: 'Email verified.' })
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<void> { await this.auth.verifyEmail(dto.token); }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response): Promise<{ accessToken: string }> {
    const tokens = await this.auth.login(dto.email, dto.password);
    this.setRefreshCookie(response, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @Post('refresh')
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response): Promise<{ accessToken: string }> {
    const tokens = await this.auth.refresh(request.cookies?.[REFRESH_COOKIE]);
    this.setRefreshCookie(response, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response): Promise<void> {
    await this.auth.logout(request.cookies?.[REFRESH_COOKIE]);
    response.clearCookie(REFRESH_COOKIE, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/api/v1/auth' });
  }

  private setRefreshCookie(response: Response, value: string): void {
    response.cookie(REFRESH_COOKIE, value, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/api/v1/auth', maxAge: 7 * 24 * 60 * 60 * 1000 });
  }
}
