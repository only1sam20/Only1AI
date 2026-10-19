import * as bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, Logger, UnauthorizedException } from '@nestjs/common';
import { IsNull, MoreThan } from 'typeorm';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { PreferredStrategy, PreferredTrade, UserProfile } from '../users/entities/user-profile.entity';
import { User } from '../users/entities/user.entity';
import { AuthToken } from './entities/auth-token.entity';
import { RefreshSession } from './entities/refresh-session.entity';

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
    getRepository: jest.fn<unknown, [unknown]>(),
    findOne: jest.fn<Promise<unknown>, [unknown, unknown]>(),
    update: jest.fn<Promise<{ affected: number }>, [unknown, unknown, unknown]>(),
  };
  const dataSource = {
    transaction: jest.fn(async (work: (manager: typeof transactionManager) => Promise<unknown>) => work(transactionManager)),
  };
  const service = new AuthService(users as never, authTokens as never, sessions as never, jwt, authEmail as never, dataSource as never);

  beforeEach(() => {
    jest.resetAllMocks();
    authTokens.create.mockImplementation((value) => value);
    sessions.create.mockImplementation((value) => value);
    transactionManager.create.mockImplementation((_entity, value) => value);
    transactionManager.save.mockImplementation(async (entity, value) => entity === User
      ? { ...value, id: 'user-1', isActive: true, emailVerifiedAt: null }
      : value);
    transactionManager.getRepository.mockImplementation((entity) => entity === RefreshSession ? sessions : suggestions);
    transactionManager.findOne.mockResolvedValue({ id: 'user-1' });
    transactionManager.update.mockResolvedValue({ affected: 1 });
    dataSource.transaction.mockImplementation(async (work) => work(transactionManager));
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

  it('rejects overlong UTF-8 passwords before creating or resetting an account', async () => {
    const password = `Aa1!${'é'.repeat(35)}`;
    await expect(service.register(validRegistration({ password }))).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.resetPassword(`${'a'.repeat(24)}.${'b'.repeat(64)}`, password)).rejects.toBeInstanceOf(BadRequestException);
    expect(users.findOneBy).not.toHaveBeenCalled();
    expect(authTokens.findOneBy).not.toHaveBeenCalled();
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
    await service.resetPassword(rawToken, 'NewSecure1!Pass');

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(transactionManager.findOne).toHaveBeenCalledWith(User, {
      select: { id: true }, where: { id: 'user-1', isActive: true }, lock: { mode: 'pessimistic_write' },
    });
    expect(transactionManager.findOne.mock.invocationCallOrder[0]).toBeLessThan(transactionManager.update.mock.invocationCallOrder[0]);
    expect(transactionManager.update).toHaveBeenNthCalledWith(1, AuthToken,
      expect.objectContaining({ id: 'reset-1', usedAt: IsNull(), expiresAt: expect.anything() }),
      { usedAt: expect.any(Date) },
    );
    expect(transactionManager.update).toHaveBeenNthCalledWith(2, User,
      { id: 'user-1', isActive: true }, expect.objectContaining({ passwordHash: expect.any(String) }));
    expect(transactionManager.update).toHaveBeenNthCalledWith(3, RefreshSession,
      { userId: 'user-1', revokedAt: IsNull() }, { revokedAt: expect.any(Date) },
    );
    const [, criteria, changes] = transactionManager.update.mock.calls[0] as [unknown, { expiresAt: unknown }, { usedAt: Date }];
    expect(criteria.expiresAt).toEqual(MoreThan(changes.usedAt));
    expect(users.update).not.toHaveBeenCalled();
    expect(sessions.update).not.toHaveBeenCalled();
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
    transactionManager.update.mockResolvedValueOnce({ affected: 0 });

    await expect(service.resetPassword(rawToken, 'NewSecure1!Pass')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(transactionManager.update).toHaveBeenCalledTimes(1);
  });

  it('aborts the reset if the account becomes inactive before the password is changed', async () => {
    const rawToken = `${'a'.repeat(24)}.${'b'.repeat(64)}`;
    authTokens.findOneBy.mockResolvedValue({
      id: 'reset-1', userId: 'user-1', tokenHash: createHash('sha256').update('b'.repeat(64)).digest('hex'),
      expiresAt: new Date(Date.now() + 60_000), usedAt: null,
    });
    users.findOneBy.mockResolvedValue({ id: 'user-1', isActive: true });
    transactionManager.findOne.mockResolvedValue(null);

    await expect(service.resetPassword(rawToken, 'NewSecure1!Pass')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(transactionManager.update).not.toHaveBeenCalled();
    expect(transactionManager.update.mock.calls.some(([entity]) => entity === RefreshSession)).toBe(false);
  });

  it('propagates a session revocation failure from the password reset transaction', async () => {
    const rawToken = `${'a'.repeat(24)}.${'b'.repeat(64)}`;
    authTokens.findOneBy.mockResolvedValue({
      id: 'reset-1', userId: 'user-1', tokenHash: createHash('sha256').update('b'.repeat(64)).digest('hex'),
      expiresAt: new Date(Date.now() + 60_000), usedAt: null,
    });
    users.findOneBy.mockResolvedValue({ id: 'user-1', isActive: true });
    transactionManager.update.mockImplementation(async (entity: unknown) => {
      if (entity === RefreshSession) throw new Error('Session revocation failed');
      return { affected: 1 };
    });

    await expect(service.resetPassword(rawToken, 'NewSecure1!Pass')).rejects.toThrow('Session revocation failed');
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(transactionManager.update).toHaveBeenCalledTimes(3);
    expect(authTokens.update).not.toHaveBeenCalled();
    expect(users.update).not.toHaveBeenCalled();
    expect(sessions.update).not.toHaveBeenCalled();
  });

  it('does not rotate a session read before a concurrent password reset revoked it', async () => {
    const rawToken = `${'a'.repeat(24)}.${'b'.repeat(64)}`;
    authTokens.findOneBy.mockResolvedValue({
      id: 'reset-1', userId: 'user-1', tokenHash: createHash('sha256').update('b'.repeat(64)).digest('hex'),
      expiresAt: new Date(Date.now() + 60_000), usedAt: null,
    });
    users.findOneBy.mockResolvedValue({ id: 'user-1', isActive: true });
    (jwt.verifyAsync as jest.Mock).mockResolvedValue({ sub: 'user-1', sid: 'session-1', type: 'refresh' });
    const sessionHash = await bcrypt.hash('valid-refresh-token', 4);
    let revoked = false;
    let signalResetLocked!: () => void;
    let resumeReset!: () => void;
    let signalSessionRead!: () => void;
    const resetLocked = new Promise<void>((resolve) => { signalResetLocked = resolve; });
    const resetPaused = new Promise<void>((resolve) => { resumeReset = resolve; });
    const sessionRead = new Promise<void>((resolve) => { signalSessionRead = resolve; });
    let transactionQueue = Promise.resolve();
    dataSource.transaction.mockImplementation(async (work) => {
      const previous = transactionQueue;
      let release!: () => void;
      transactionQueue = new Promise<void>((resolve) => { release = resolve; });
      await previous;
      try { return await work(transactionManager); } finally { release(); }
    });
    let lockCount = 0;
    transactionManager.findOne.mockImplementation(async () => {
      if (lockCount++ === 0) {
        signalResetLocked();
        await resetPaused;
      }
      return { id: 'user-1' };
    });
    transactionManager.update.mockImplementation(async (entity) => {
      if (entity === RefreshSession) revoked = true;
      return { affected: 1 };
    });
    sessions.findOneBy.mockImplementation(async () => {
      signalSessionRead();
      return { id: 'session-1', userId: 'user-1', tokenHash: sessionHash, expiresAt: new Date(Date.now() + 60_000), revokedAt: null };
    });
    sessions.update.mockImplementation(async () => ({ affected: revoked ? 0 : 1 }));

    const reset = service.resetPassword(rawToken, 'NewSecure1!Pass');
    await resetLocked;
    const refresh = expect(service.refresh('valid-refresh-token')).rejects.toBeInstanceOf(UnauthorizedException);
    await sessionRead;
    resumeReset();
    await reset;
    await refresh;

    expect(sessions.update).toHaveBeenCalledTimes(1);
    expect(sessions.create).not.toHaveBeenCalled();
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
    sessions.findOneBy.mockResolvedValue({ id: 'session-1', userId: 'user-1', tokenHash, expiresAt: new Date(Date.now() + 60_000), revokedAt: null });
    transactionManager.findOne.mockResolvedValue(null);

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

  it.each(['TokenExpiredError', 'JsonWebTokenError'])('returns unauthorized rather than a server error for %s', async (name) => {
    (jwt.verifyAsync as jest.Mock).mockRejectedValue(Object.assign(new Error('JWT rejected'), { name }));

    await expect(service.refresh('invalid-refresh-token')).rejects.toMatchObject({ status: 401 });

    expect(jwt.verifyAsync).toHaveBeenCalledWith('invalid-refresh-token', { issuer: 'only1ai' });
    expect(sessions.findOneBy).not.toHaveBeenCalled();
    expect(sessions.create).not.toHaveBeenCalled();
  });

  it('keeps logout idempotent when JWT verification fails', async () => {
    (jwt.verifyAsync as jest.Mock).mockRejectedValue(new Error('JWT expired'));

    await expect(service.logout('expired-refresh-token')).resolves.toBeUndefined();

    expect(sessions.update).not.toHaveBeenCalled();
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
    transactionManager.findOne.mockResolvedValue({ id: 'user-1', passwordHash, emailVerifiedAt: new Date() });
    (jwt.signAsync as jest.Mock).mockResolvedValueOnce('refresh-token').mockResolvedValueOnce('access-token');

    await service.login('trader@example.com', 'Secure1!Pass');

    expect(jwt.signAsync).toHaveBeenNthCalledWith(1, expect.objectContaining({ type: 'refresh' }), { expiresIn: '2h' });
    expect(jwt.signAsync).toHaveBeenNthCalledWith(2, expect.objectContaining({ type: 'access' }), { expiresIn: '20m' });
    expect(service.getRefreshCookieMaxAge()).toBe(2 * 60 * 60 * 1_000);
  });

  it('does not create a session if the password changed while login was in progress', async () => {
    const oldHash = await bcrypt.hash('Secure1!Pass', 4);
    const getOne = jest.fn().mockResolvedValue({
      id: 'user-1', email: 'trader@example.com', passwordHash: oldHash, isActive: true, emailVerifiedAt: new Date(),
    });
    users.createQueryBuilder.mockReturnValue({ addSelect: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), getOne });
    transactionManager.findOne.mockResolvedValue({ id: 'user-1', passwordHash: 'new-password-hash', emailVerifiedAt: new Date() });

    await expect(service.login('trader@example.com', 'Secure1!Pass')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(transactionManager.findOne).toHaveBeenCalledWith(User, {
      select: { id: true, passwordHash: true, emailVerifiedAt: true },
      where: { id: 'user-1', isActive: true }, lock: { mode: 'pessimistic_write' },
    });
    expect(sessions.create).not.toHaveBeenCalled();
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });

  describe('single-use verification links', () => {
    const rawToken = `${'e'.repeat(24)}.${'f'.repeat(64)}`;

    beforeEach(() => {
      authTokens.findOneBy.mockResolvedValue({
        id: 'verification-1',
        userId: 'user-1',
        tokenHash: createHash('sha256').update('f'.repeat(64)).digest('hex'),
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: null,
      });
    });

    it('consumes a valid verification token before marking its user verified', async () => {
      await expect(service.verifyEmail(rawToken)).resolves.toBeUndefined();

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(transactionManager.update).toHaveBeenNthCalledWith(1, AuthToken,
        expect.objectContaining({ id: 'verification-1', usedAt: IsNull(), expiresAt: expect.anything() }),
        { usedAt: expect.any(Date) },
      );
      expect(transactionManager.update).toHaveBeenNthCalledWith(2, User,
        { id: 'user-1' }, { emailVerifiedAt: expect.any(Date) });
      const [, criteria, changes] = transactionManager.update.mock.calls[0] as unknown as [unknown, { expiresAt: unknown }, { usedAt: Date }];
      expect(criteria.expiresAt).toEqual(MoreThan(changes.usedAt));
      expect(authTokens.update).not.toHaveBeenCalled();
      expect(users.update).not.toHaveBeenCalled();
      expect(authTokens.save).not.toHaveBeenCalled();
    });

    it('rejects reuse even when token lookup returned a stale unused record', async () => {
      transactionManager.update.mockResolvedValueOnce({ affected: 1 }).mockResolvedValueOnce({ affected: 1 }).mockResolvedValueOnce({ affected: 0 });

      await service.verifyEmail(rawToken);
      await expect(service.verifyEmail(rawToken)).rejects.toBeInstanceOf(UnauthorizedException);

      expect(transactionManager.update.mock.calls.filter(([entity]) => entity === User)).toHaveLength(1);
    });

    it('allows only one of two simultaneous verification requests to update the user', async () => {
      let consumed = false;
      transactionManager.update.mockImplementation(async (entity: unknown) => {
        if (entity === AuthToken) {
          if (consumed) return { affected: 0 };
          consumed = true;
        }
        return { affected: 1 };
      });

      const results = await Promise.allSettled([service.verifyEmail(rawToken), service.verifyEmail(rawToken)]);

      expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
      expect(results.filter((result) => result.status === 'rejected')).toEqual([
        expect.objectContaining({ reason: expect.any(UnauthorizedException) }),
      ]);
      expect(transactionManager.update.mock.calls.filter(([entity]) => entity === User)).toHaveLength(1);
    });

    it('propagates a user update failure from the verification transaction', async () => {
      transactionManager.update.mockImplementation(async (entity: unknown) => {
        if (entity === User) throw new Error('User update failed');
        return { affected: 1 };
      });

      await expect(service.verifyEmail(rawToken)).rejects.toThrow('User update failed');
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(transactionManager.update).toHaveBeenCalledTimes(2);
      expect(authTokens.update).not.toHaveBeenCalled();
      expect(users.update).not.toHaveBeenCalled();
    });
  });

  describe('single-use refresh sessions', () => {
    beforeEach(async () => {
      (jwt.verifyAsync as jest.Mock).mockResolvedValue({ sub: 'user-1', sid: 'session-1', type: 'refresh' });
      sessions.findOneBy.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        tokenHash: await bcrypt.hash('valid-refresh-token', 4),
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
      });
      users.findOneBy.mockResolvedValue({ id: 'user-1', isActive: true });
      sessions.save.mockImplementation(async (value) => ({ ...value, id: value.id ?? 'replacement-session' }));
      (jwt.signAsync as jest.Mock).mockImplementation(async ({ type }) => type === 'refresh'
        ? 'replacement-refresh-token'
        : 'replacement-access-token');
    });

    it('conditionally revokes the previous session before issuing its replacement', async () => {
      sessions.update.mockResolvedValue({ affected: 1 });

      await expect(service.refresh('valid-refresh-token')).resolves.toEqual({
        accessToken: 'replacement-access-token',
        refreshToken: 'replacement-refresh-token',
      });

      expect(sessions.update).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'session-1', userId: 'user-1', revokedAt: IsNull(), expiresAt: expect.anything() }),
        { revokedAt: expect.any(Date) },
      );
      expect(transactionManager.findOne).toHaveBeenCalledWith(User, {
        select: { id: true }, where: { id: 'user-1', isActive: true }, lock: { mode: 'pessimistic_write' },
      });
      expect(transactionManager.findOne.mock.invocationCallOrder[0]).toBeLessThan(sessions.update.mock.invocationCallOrder[0]);
      expect(sessions.create).toHaveBeenCalledTimes(1);
      expect(sessions.update.mock.invocationCallOrder[0]).toBeLessThan(sessions.create.mock.invocationCallOrder[0]);
      expect(jwt.verifyAsync).toHaveBeenCalledWith('valid-refresh-token', { issuer: 'only1ai' });
    });

    it('rejects a refresh JWT subject that does not own the referenced session', async () => {
      sessions.findOneBy.mockResolvedValue({
        id: 'session-1',
        userId: 'another-user',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      });

      await expect(service.refresh('valid-refresh-token')).rejects.toBeInstanceOf(UnauthorizedException);

      expect(sessions.update).not.toHaveBeenCalled();
      expect(sessions.create).not.toHaveBeenCalled();
      expect(jwt.signAsync).not.toHaveBeenCalled();
    });

    it('rejects a session already marked revoked without creating another session', async () => {
      sessions.findOneBy.mockResolvedValue({
        id: 'session-1',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
      });

      await expect(service.refresh('valid-refresh-token')).rejects.toBeInstanceOf(UnauthorizedException);

      expect(sessions.update).not.toHaveBeenCalled();
      expect(sessions.create).not.toHaveBeenCalled();
      expect(jwt.signAsync).not.toHaveBeenCalled();
    });

    it('rejects rotation when another request has already consumed the session', async () => {
      sessions.update.mockResolvedValue({ affected: 0 });

      await expect(service.refresh('valid-refresh-token')).rejects.toBeInstanceOf(UnauthorizedException);

      expect(sessions.create).not.toHaveBeenCalled();
      expect(sessions.save).not.toHaveBeenCalled();
      expect(jwt.signAsync).not.toHaveBeenCalled();
    });

    it('allows only one of two simultaneous refresh requests to issue replacement tokens', async () => {
      let consumed = false;
      sessions.update.mockImplementation(async () => {
        if (consumed) return { affected: 0 };
        consumed = true;
        return { affected: 1 };
      });

      const results = await Promise.allSettled([
        service.refresh('valid-refresh-token'),
        service.refresh('valid-refresh-token'),
      ]);

      expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
      expect(results.filter((result) => result.status === 'rejected')).toEqual([
        expect.objectContaining({ reason: expect.any(UnauthorizedException) }),
      ]);
      expect(sessions.create).toHaveBeenCalledTimes(1);
      expect(sessions.save).toHaveBeenCalledTimes(2);
      expect(jwt.signAsync).toHaveBeenCalledTimes(2);
    });
  });
});
