import * as bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { PreferredStrategy, PreferredTrade, UserProfile } from '../users/entities/user-profile.entity';
import { User } from '../users/entities/user.entity';

const validRegistration = (overrides: Partial<RegisterDto> = {}): RegisterDto => ({
  email: 'trader@example.com',
  password: 'Secure1!Pass',
  traderName: 'Ada Trader',
  preferredTrade: PreferredTrade.FOREX,
  preferredStrategy: PreferredStrategy.SMC,
  ...overrides,
});

describe('AuthService', () => {
  const users = {
    findOneBy: jest.fn(),
    createQueryBuilder: jest.fn(),
    update: jest.fn(),
  };
  const authTokens = { create: jest.fn((value) => value), save: jest.fn(), findOneBy: jest.fn(), update: jest.fn() };
  const sessions = { create: jest.fn((value) => value), save: jest.fn(), findOneBy: jest.fn(), update: jest.fn() };
  const jwt = { signAsync: jest.fn(), verifyAsync: jest.fn() } as unknown as JwtService;
  const authEmail = { sendEmailVerification: jest.fn(), sendPasswordReset: jest.fn() };
  const suggestions = { upsert: jest.fn() };
  const transactionManager = {
    create: jest.fn((_entity: unknown, value: Record<string, unknown>) => value),
    save: jest.fn(async (entity: unknown, value: Record<string, unknown>) => entity === User
      ? { ...value, id: 'user-1', isActive: true, emailVerifiedAt: null }
      : value),
    getRepository: jest.fn(() => suggestions),
  };
  const dataSource = {
    transaction: jest.fn(async (work: (manager: typeof transactionManager) => Promise<unknown>) => work(transactionManager)),
  };
  const service = new AuthService(users as never, authTokens as never, sessions as never, jwt, authEmail as never, dataSource as never);

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.JWT_ACCESS_TTL;
    delete process.env.JWT_REFRESH_TTL;
  });

  it('accepts an existing verified registration without revealing or changing the account', async () => {
    users.findOneBy.mockResolvedValue({ id: 'user-1', email: 'trader@example.com', isActive: true, emailVerifiedAt: new Date() });

    await expect(service.register(validRegistration())).resolves.toBeUndefined();

    expect(dataSource.transaction).not.toHaveBeenCalled();
    expect(authEmail.sendEmailVerification).not.toHaveBeenCalled();
  });

  it('reissues verification instructions for an existing unverified active account', async () => {
    users.findOneBy.mockResolvedValue({ id: 'user-1', email: 'trader@example.com', isActive: true, emailVerifiedAt: null });

    await service.register(validRegistration());

    expect(authTokens.save).toHaveBeenCalledTimes(1);
    expect(authEmail.sendEmailVerification).toHaveBeenCalledWith('trader@example.com', expect.stringMatching(/^[a-f0-9]{24}\.[a-f0-9]{64}$/));
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('keeps registration non-enumerating when verification delivery fails', async () => {
    users.findOneBy.mockResolvedValue(undefined);
    authEmail.sendEmailVerification.mockRejectedValue(new Error('Resend unavailable'));

    const logger = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    await expect(service.register(validRegistration({ email: 'new@example.com' }))).resolves.toBeUndefined();
    expect(logger).toHaveBeenCalledWith(expect.stringContaining('Verification email delivery failed'));
    logger.mockRestore();
  });

  it('persists onboarding preferences and an anonymous custom suggestion', async () => {
    users.findOneBy.mockResolvedValue(undefined);

    await service.register(validRegistration({
      traderName: '  Ada   Trader  ',
      preferredTrade: PreferredTrade.CRYPTO,
      preferredStrategy: PreferredStrategy.CUSTOM,
      customStrategy: '  Liquidity   Sweep  ',
    }));

    expect(transactionManager.save).toHaveBeenCalledWith(UserProfile, expect.objectContaining({
      userId: 'user-1',
      displayName: 'Ada Trader',
      preferredTrade: PreferredTrade.CRYPTO,
      preferredStrategy: PreferredStrategy.CUSTOM,
      customStrategy: 'Liquidity Sweep',
    }));
    expect(suggestions.upsert).toHaveBeenCalledWith({
      name: 'Liquidity Sweep',
      normalizedName: 'liquidity sweep',
    }, ['normalizedName']);
  });

  it('does not create onboarding records when an existing account registers again', async () => {
    users.findOneBy.mockResolvedValue({ id: 'user-1', email: 'trader@example.com', isActive: true, emailVerifiedAt: new Date() });

    await service.register(validRegistration({ preferredStrategy: PreferredStrategy.CUSTOM, customStrategy: 'Private strategy' }));

    expect(dataSource.transaction).not.toHaveBeenCalled();
    expect(suggestions.upsert).not.toHaveBeenCalled();
  });

  it('enforces the password policy even when the service is invoked directly', async () => {
    await expect(service.register(validRegistration({ password: 'weakpass' }))).rejects.toBeInstanceOf(BadRequestException);
    expect(users.findOneBy).not.toHaveBeenCalled();
  });

  it('accepts a password reset request for an unknown email without creating a token', async () => {
    users.findOneBy.mockResolvedValue(undefined);

    await expect(service.requestPasswordReset('unknown@example.com')).resolves.toBeUndefined();

    expect(authTokens.save).not.toHaveBeenCalled();
    expect(authEmail.sendPasswordReset).not.toHaveBeenCalled();
  });

  it('sends a reset link for an active account while invalidating prior reset tokens', async () => {
    users.findOneBy.mockResolvedValue({ id: 'user-1', email: 'trader@example.com', isActive: true });
    authTokens.update.mockResolvedValue({ affected: 0 });

    await service.requestPasswordReset('trader@example.com');

    expect(authTokens.update).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', type: 'password_reset' }),
      expect.objectContaining({ usedAt: expect.any(Date) }),
    );
    expect(authTokens.save).toHaveBeenCalledTimes(1);
    expect(authEmail.sendPasswordReset).toHaveBeenCalledWith('trader@example.com', expect.stringMatching(/^[a-f0-9]{24}\.[a-f0-9]{64}$/));
  });

  it('consumes a reset token, updates the password, and revokes active refresh sessions', async () => {
    const rawToken = `${'a'.repeat(24)}.${'b'.repeat(64)}`;
    const tokenHash = createHash('sha256').update('b'.repeat(64)).digest('hex');
    authTokens.findOneBy.mockResolvedValue({
      id: 'reset-1',
      userId: 'user-1',
      tokenHash,
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
    });
    users.findOneBy.mockResolvedValue({ id: 'user-1', isActive: true });
    authTokens.update.mockResolvedValue({ affected: 1 });

    await service.resetPassword(rawToken, 'NewSecure1!Pass');

    expect(authTokens.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'reset-1' }),
      expect.objectContaining({ usedAt: expect.any(Date) }),
    );
    expect(users.update).toHaveBeenCalledWith('user-1', expect.objectContaining({ passwordHash: expect.any(String) }));
    expect(sessions.update).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1' }),
      expect.objectContaining({ revokedAt: expect.any(Date) }),
    );
  });

  it('rejects a password reset token that was already consumed by another request', async () => {
    const rawToken = `${'c'.repeat(24)}.${'d'.repeat(64)}`;
    const tokenHash = createHash('sha256').update('d'.repeat(64)).digest('hex');
    authTokens.findOneBy.mockResolvedValue({
      id: 'reset-1',
      userId: 'user-1',
      tokenHash,
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
    });
    users.findOneBy.mockResolvedValue({ id: 'user-1', isActive: true });
    authTokens.update.mockResolvedValue({ affected: 0 });

    await expect(service.resetPassword(rawToken, 'NewSecure1!Pass')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(users.update).not.toHaveBeenCalled();
  });

  it('rejects an inactive account at login', async () => {
    const passwordHash = await bcrypt.hash('Secure1!Pass', 4);
    const getOne = jest.fn().mockResolvedValue({
      id: 'user-1',
      email: 'trader@example.com',
      passwordHash,
      isActive: false,
      emailVerifiedAt: new Date(),
    });
    const query = { addSelect: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), getOne };
    users.createQueryBuilder.mockReturnValue(query);

    await expect(service.login('trader@example.com', 'Secure1!Pass')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(sessions.save).not.toHaveBeenCalled();
  });

  it('rejects a refresh token when its user is inactive', async () => {
    (jwt.verifyAsync as jest.Mock).mockResolvedValue({ sub: 'user-1', sid: 'session-1', type: 'refresh' });
    const tokenHash = await bcrypt.hash('valid-refresh-token', 4);
    sessions.findOneBy.mockResolvedValue({ id: 'session-1', tokenHash, expiresAt: new Date(Date.now() + 60_000), revokedAt: null });
    users.findOneBy.mockResolvedValue(undefined);

    await expect(service.refresh('valid-refresh-token')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(sessions.save).not.toHaveBeenCalled();
  });

  it('rejects a missing refresh token before JWT verification', async () => {
    await expect(service.refresh(undefined)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwt.verifyAsync).not.toHaveBeenCalled();
  });

  it('rejects a refresh token that is not a refresh session', async () => {
    (jwt.verifyAsync as jest.Mock).mockResolvedValue({ sub: 'user-1', sid: 'session-1', type: 'access' });
    await expect(service.refresh('invalid-refresh-token')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('uses configured access and refresh TTL values for sessions and JWTs', async () => {
    process.env.JWT_ACCESS_TTL = '20m';
    process.env.JWT_REFRESH_TTL = '2h';
    const passwordHash = await bcrypt.hash('Secure1!Pass', 4);
    const getOne = jest.fn().mockResolvedValue({
      id: 'user-1',
      email: 'trader@example.com',
      passwordHash,
      isActive: true,
      emailVerifiedAt: new Date(),
    });
    const query = { addSelect: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), getOne };
    users.createQueryBuilder.mockReturnValue(query);
    sessions.save.mockImplementation(async (value) => ({ ...value, id: value.id ?? 'session-1' }));
    (jwt.signAsync as jest.Mock).mockResolvedValueOnce('refresh-token').mockResolvedValueOnce('access-token');

    await service.login('trader@example.com', 'Secure1!Pass');

    expect(jwt.signAsync).toHaveBeenNthCalledWith(1, expect.objectContaining({ type: 'refresh' }), { expiresIn: '2h' });
    expect(jwt.signAsync).toHaveBeenNthCalledWith(2, expect.objectContaining({ type: 'access' }), { expiresIn: '20m' });
    expect(service.getRefreshCookieMaxAge()).toBe(2 * 60 * 60 * 1_000);
  });
});
