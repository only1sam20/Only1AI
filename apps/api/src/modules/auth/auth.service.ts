import { ConflictException, ForbiddenException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { IsNull, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { AuthToken, AuthTokenType } from './entities/auth-token.entity';
import { RefreshSession } from './entities/refresh-session.entity';

export type AuthResult = { accessToken: string; refreshToken: string };

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly verificationTokenTtlMs = 24 * 60 * 60 * 1000;
  private readonly refreshTokenTtlMs = 7 * 24 * 60 * 60 * 1000;

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(AuthToken) private readonly authTokens: Repository<AuthToken>,
    @InjectRepository(RefreshSession) private readonly sessions: Repository<RefreshSession>,
    private readonly jwt: JwtService,
  ) {}

  async register(email: string, password: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    if (await this.users.exists({ where: { email: normalizedEmail } })) {
      throw new ConflictException('Unable to create account with these details.');
    }
    const user = await this.users.save(this.users.create({
      email: normalizedEmail,
      passwordHash: await bcrypt.hash(password, 12),
      emailVerifiedAt: null,
    }));
    const token = randomBytes(32).toString('hex');
    await this.authTokens.save(this.authTokens.create({
      userId: user.id,
      type: AuthTokenType.EMAIL_VERIFICATION,
      tokenHash: await bcrypt.hash(token, 12),
      expiresAt: new Date(Date.now() + this.verificationTokenTtlMs),
      usedAt: null,
    }));
    if (process.env.NODE_ENV === 'development') this.logger.debug(`Email verification token for ${user.id}: ${token}`);
  }

  async verifyEmail(token: string): Promise<void> {
    const candidates = await this.authTokens.find({ where: { type: AuthTokenType.EMAIL_VERIFICATION, usedAt: IsNull() } });
    const record = await this.findMatchingToken(candidates, token);
    if (!record || record.expiresAt <= new Date()) throw new UnauthorizedException('Invalid or expired verification token.');
    await this.users.update(record.userId, { emailVerifiedAt: new Date() });
    record.usedAt = new Date();
    await this.authTokens.save(record);
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const user = await this.users.createQueryBuilder('user').addSelect('user.passwordHash')
      .where('user.email = :email', { email: email.trim().toLowerCase() }).getOne();
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new UnauthorizedException('Invalid email or password.');
    if (!user.emailVerifiedAt) throw new ForbiddenException('Verify your email before signing in.');
    return this.createSession(user.id);
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const session = await this.sessions.findOneBy({ id: payload.sid });
    if (!session || session.revokedAt || session.expiresAt <= new Date() || !(await bcrypt.compare(refreshToken, session.tokenHash))) {
      throw new UnauthorizedException('Session has expired.');
    }
    session.revokedAt = new Date();
    await this.sessions.save(session);
    return this.createSession(payload.sub);
  }

  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) return;
    try {
      const payload = await this.verifyRefreshToken(refreshToken);
      await this.sessions.update({ id: payload.sid, revokedAt: IsNull() }, { revokedAt: new Date() });
    } catch { /* Logout should remain idempotent. */ }
  }

  private async createSession(userId: string): Promise<AuthResult> {
    const session = await this.sessions.save(this.sessions.create({ userId, tokenHash: 'pending', expiresAt: new Date(Date.now() + this.refreshTokenTtlMs), revokedAt: null }));
    const refreshToken = await this.jwt.signAsync({ sub: userId, sid: session.id, type: 'refresh' }, { expiresIn: '7d' });
    session.tokenHash = await bcrypt.hash(refreshToken, 12);
    await this.sessions.save(session);
    const accessToken = await this.jwt.signAsync({ sub: userId, type: 'access' }, { expiresIn: '15m' });
    return { accessToken, refreshToken };
  }

  private async verifyRefreshToken(token: string): Promise<{ sub: string; sid: string; type: string }> {
    const payload = await this.jwt.verifyAsync<{ sub: string; sid: string; type: string }>(token);
    if (payload.type !== 'refresh' || !payload.sub || !payload.sid) throw new UnauthorizedException('Invalid session.');
    return payload;
  }

  private async findMatchingToken(records: AuthToken[], token: string): Promise<AuthToken | undefined> {
    for (const record of records) if (await bcrypt.compare(token, record.tokenHash)) return record;
    return undefined;
  }
}
