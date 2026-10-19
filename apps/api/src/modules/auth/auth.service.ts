import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { DataSource, IsNull, MoreThan, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { PreferredStrategy, UserProfile } from '../users/entities/user-profile.entity';
import { User } from '../users/entities/user.entity';
import { AuthToken, AuthTokenType } from './entities/auth-token.entity';
import { RefreshSession } from './entities/refresh-session.entity';
import { AuthEmailService } from './auth-email.service';
import { getAccessTokenTtl, getPasswordResetTokenTtlMilliseconds, getRefreshTokenTtl, getRefreshTokenTtlMilliseconds } from './token-ttl';
import { RegisterDto } from './dto/register.dto';
import { hasStrongPassword, PASSWORD_POLICY_MESSAGE } from './password-policy';
import { StrategySuggestion } from '../strategies/entities/strategy-suggestion.entity';

export type AuthResult = { accessToken: string; refreshToken: string };

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly verificationTokenTtlMs = 24 * 60 * 60 * 1000;

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(AuthToken) private readonly authTokens: Repository<AuthToken>,
    @InjectRepository(RefreshSession) private readonly sessions: Repository<RefreshSession>,
    private readonly jwt: JwtService,
    private readonly authEmail: AuthEmailService,
    private readonly dataSource: DataSource,
  ) {}

  async register(dto: RegisterDto): Promise<void> {
    if (!hasStrongPassword(dto.password)) throw new BadRequestException(PASSWORD_POLICY_MESSAGE);

    const normalizedEmail = dto.email.trim().toLowerCase();
    const existingUser = await this.users.findOneBy({ email: normalizedEmail });
    if (existingUser) {
      if (existingUser.isActive && !existingUser.emailVerifiedAt) {
        await this.createAndDeliverEmailVerification(existingUser);
      }
      return;
    }

    let user: User;
    try {
      const traderName = this.normalizeText(dto.traderName);
      const customStrategy = this.getCustomStrategy(dto);
      user = await this.dataSource.transaction(async (manager) => {
        const createdUser = await manager.save(User, manager.create(User, {
          email: normalizedEmail,
          passwordHash: await bcrypt.hash(dto.password, 12),
          emailVerifiedAt: null,
        }));
        await manager.save(UserProfile, manager.create(UserProfile, {
          userId: createdUser.id,
          displayName: traderName,
          timezone: null,
          bio: null,
          preferredTrade: dto.preferredTrade,
          preferredStrategy: dto.preferredStrategy,
          customStrategy,
        }));
        if (customStrategy) {
          await manager.getRepository(StrategySuggestion).upsert({
            name: customStrategy,
            normalizedName: this.normalizeSuggestion(customStrategy),
          }, ['normalizedName']);
        }
        return createdUser;
      });
    } catch (error) {
      // A concurrent registration must not make an email address observable.
      if (!this.isUniqueViolation(error)) throw error;
      const concurrentUser = await this.users.findOneBy({ email: normalizedEmail });
      if (concurrentUser?.isActive && !concurrentUser.emailVerifiedAt) {
        await this.createAndDeliverEmailVerification(concurrentUser);
      }
      return;
    }

    await this.createAndDeliverEmailVerification(user);
  }

  async verifyEmail(token: string): Promise<void> {
    const record = await this.findMatchingToken(AuthTokenType.EMAIL_VERIFICATION, token);
    if (!record || record.expiresAt <= new Date()) throw new UnauthorizedException('Invalid or expired verification token.');
    await this.dataSource.transaction(async (manager) => {
      const verifiedAt = new Date();
      const consumed = await manager.update(AuthToken, { id: record.id, usedAt: IsNull(), expiresAt: MoreThan(verifiedAt) }, { usedAt: verifiedAt });
      if (consumed.affected !== 1) throw new UnauthorizedException('Invalid or expired verification token.');
      const updated = await manager.update(User, { id: record.userId }, { emailVerifiedAt: verifiedAt });
      if (updated.affected !== 1) throw new UnauthorizedException('Invalid or expired verification token.');
    });
  }

  async requestPasswordReset(email: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.users.findOneBy({ email: normalizedEmail });
    if (!user || !user.isActive) return;
    await this.createAndDeliverPasswordReset(user);
  }

  async resetPassword(token: string, password: string): Promise<void> {
    if (!hasStrongPassword(password)) throw new BadRequestException(PASSWORD_POLICY_MESSAGE);
    const record = await this.findMatchingToken(AuthTokenType.PASSWORD_RESET, token);
    if (!record || record.expiresAt <= new Date()) {
      throw new UnauthorizedException('Invalid or expired password reset token.');
    }

    const user = await this.users.findOneBy({ id: record.userId, isActive: true });
    if (!user) throw new UnauthorizedException('Invalid or expired password reset token.');

    // Compute the expensive hash before holding database locks. Consume the
    // link, change the password and revoke sessions as one atomic operation.
    const passwordHash = await bcrypt.hash(password, 12);
    await this.dataSource.transaction(async (manager) => {
      // Login and refresh acquire the same user lock before issuing sessions.
      // A reset can therefore revoke every session issued before it commits.
      const lockedUser = await manager.findOne(User, {
        select: { id: true }, where: { id: user.id, isActive: true }, lock: { mode: 'pessimistic_write' },
      });
      if (!lockedUser) throw new UnauthorizedException('Invalid or expired password reset token.');
      const resetAt = new Date();
      const consumed = await manager.update(AuthToken, { id: record.id, usedAt: IsNull(), expiresAt: MoreThan(resetAt) }, { usedAt: resetAt });
      if (consumed.affected !== 1) throw new UnauthorizedException('Invalid or expired password reset token.');
      const updated = await manager.update(User, { id: user.id, isActive: true }, { passwordHash });
      if (updated.affected !== 1) throw new UnauthorizedException('Invalid or expired password reset token.');
      await manager.update(RefreshSession, { userId: user.id, revokedAt: IsNull() }, { revokedAt: resetAt });
    });
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const user = await this.users.createQueryBuilder('user').addSelect('user.passwordHash')
      .where('user.email = :email', { email: email.trim().toLowerCase() }).getOne();
    if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password.');
    }
    if (!user.emailVerifiedAt) throw new UnauthorizedException('Invalid email or password.');
    return this.dataSource.transaction(async (manager) => {
      const lockedUser = await manager.findOne(User, {
        select: { id: true, passwordHash: true, emailVerifiedAt: true },
        where: { id: user.id, isActive: true }, lock: { mode: 'pessimistic_write' },
      });
      // The password may have changed while bcrypt was checking the original
      // hash. Never issue a new session against that stale credential.
      if (!lockedUser || !lockedUser.emailVerifiedAt || lockedUser.passwordHash !== user.passwordHash) {
        throw new UnauthorizedException('Invalid email or password.');
      }
      return this.createSession(user.id, manager.getRepository(RefreshSession));
    });
  }

  async refresh(refreshToken: string | undefined): Promise<AuthResult> {
    if (!refreshToken) throw new UnauthorizedException('Session has expired.');
    const payload = await this.verifyRefreshToken(refreshToken);
    const session = await this.sessions.findOneBy({ id: payload.sid });
    if (!session || session.userId !== payload.sub || session.revokedAt || session.expiresAt <= new Date() || !(await bcrypt.compare(refreshToken, session.tokenHash))) {
      throw new UnauthorizedException('Session has expired.');
    }
    return this.dataSource.transaction(async (manager) => {
      const lockedUser = await manager.findOne(User, {
        select: { id: true }, where: { id: payload.sub, isActive: true }, lock: { mode: 'pessimistic_write' },
      });
      if (!lockedUser) throw new UnauthorizedException('Session has expired.');
      const sessions = manager.getRepository(RefreshSession);
      const rotatedAt = new Date();
      const consumed = await sessions.update(
        { id: session.id, userId: payload.sub, revokedAt: IsNull(), expiresAt: MoreThan(rotatedAt) },
        { revokedAt: rotatedAt },
      );
      if (consumed.affected !== 1) throw new UnauthorizedException('Session has expired.');
      return this.createSession(payload.sub, sessions);
    });
  }

  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) return;
    try {
      const payload = await this.verifyRefreshToken(refreshToken);
      await this.sessions.update({ id: payload.sid, revokedAt: IsNull() }, { revokedAt: new Date() });
    } catch { /* Logout should remain idempotent. */ }
  }

  getRefreshCookieMaxAge(): number {
    return getRefreshTokenTtlMilliseconds();
  }

  private async createAndDeliverEmailVerification(user: Pick<User, 'id' | 'email'>): Promise<void> {
    const token = await this.issueToken(user.id, AuthTokenType.EMAIL_VERIFICATION, this.verificationTokenTtlMs);
    try {
      await this.authEmail.sendEmailVerification(user.email, token);
    } catch (error) {
      // Do not disclose delivery success or failure from registration: doing so
      // would let callers infer whether an address is already registered.
      const details = error instanceof Error ? error.message : 'Unknown email provider error';
      this.logger.error(`Verification email delivery failed for user ${user.id}: ${details}`);
    }
  }

  private async createAndDeliverPasswordReset(user: Pick<User, 'id' | 'email'>): Promise<void> {
    const requestedAt = new Date();
    await this.authTokens.update(
      { userId: user.id, type: AuthTokenType.PASSWORD_RESET, usedAt: IsNull() },
      { usedAt: requestedAt },
    );
    const token = await this.issueToken(user.id, AuthTokenType.PASSWORD_RESET, getPasswordResetTokenTtlMilliseconds());
    try {
      await this.authEmail.sendPasswordReset(user.email, token);
    } catch (error) {
      // A reset request always returns the same generic response. This keeps
      // account existence and provider availability out of the public API.
      const details = error instanceof Error ? error.message : 'Unknown email provider error';
      this.logger.error(`Password reset email delivery failed for user ${user.id}: ${details}`);
    }
  }

  private async createSession(userId: string, sessions: Repository<RefreshSession>): Promise<AuthResult> {
    const refreshTokenTtl = getRefreshTokenTtl();
    const session = await sessions.save(sessions.create({
      userId,
      tokenHash: 'pending',
      expiresAt: new Date(Date.now() + getRefreshTokenTtlMilliseconds()),
      revokedAt: null,
    }));
    const refreshToken = await this.jwt.signAsync({ sub: userId, sid: session.id, type: 'refresh' }, { expiresIn: refreshTokenTtl });
    session.tokenHash = await bcrypt.hash(refreshToken, 12);
    await sessions.save(session);
    const accessToken = await this.jwt.signAsync({ sub: userId, type: 'access' }, { expiresIn: getAccessTokenTtl() });
    return { accessToken, refreshToken };
  }

  private async verifyRefreshToken(token: string): Promise<{ sub: string; sid: string; type: string }> {
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; sid: string; type: string }>(token, { issuer: 'only1ai' });
      if (payload.type !== 'refresh' || typeof payload.sub !== 'string' || !payload.sub || typeof payload.sid !== 'string' || !payload.sid) {
        throw new UnauthorizedException('Session has expired.');
      }
      return payload;
    } catch {
      throw new UnauthorizedException('Session has expired.');
    }
  }

  private async issueToken(userId: string, type: AuthTokenType, ttlMilliseconds: number): Promise<string> {
    const selector = randomBytes(12).toString('hex');
    const secret = randomBytes(32).toString('hex');
    await this.authTokens.save(this.authTokens.create({
      userId,
      type,
      selector,
      tokenHash: this.tokenDigest(secret),
      expiresAt: new Date(Date.now() + ttlMilliseconds),
      usedAt: null,
    }));
    return `${selector}.${secret}`;
  }

  private async findMatchingToken(type: AuthTokenType, token: string): Promise<AuthToken | undefined> {
    const [selector, secret, ...extraParts] = token.split('.');
    if (!selector || !secret || extraParts.length || !/^[a-f0-9]{24}$/i.test(selector) || !/^[a-f0-9]{64}$/i.test(secret)) return undefined;
    const record = await this.authTokens.findOneBy({ type, selector, usedAt: IsNull() });
    if (!record) return undefined;
    const expected = Buffer.from(record.tokenHash, 'hex');
    const actual = Buffer.from(this.tokenDigest(secret), 'hex');
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return undefined;
    return record;
  }

  private tokenDigest(secret: string): string {
    return createHash('sha256').update(secret).digest('hex');
  }

  private getCustomStrategy(dto: RegisterDto): string | null {
    if (dto.preferredStrategy !== PreferredStrategy.CUSTOM) return null;
    const customStrategy = typeof dto.customStrategy === 'string' ? this.normalizeText(dto.customStrategy) : '';
    if (customStrategy.length < 3 || customStrategy.length > 160) {
      throw new BadRequestException('A custom strategy must be between 3 and 160 characters.');
    }
    return customStrategy;
  }

  private normalizeText(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }

  private normalizeSuggestion(value: string): string {
    return this.normalizeText(value).toLocaleLowerCase();
  }

  private isUniqueViolation(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
  }
}
