import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const users = { exists: jest.fn(), create: jest.fn((value) => value), save: jest.fn() };
  const authTokens = { create: jest.fn((value) => value), save: jest.fn(), find: jest.fn() };
  const sessions = { create: jest.fn((value) => value), save: jest.fn(), findOneBy: jest.fn(), update: jest.fn() };
  const jwt = { signAsync: jest.fn(), verifyAsync: jest.fn() } as unknown as JwtService;
  const service = new AuthService(users as never, authTokens as never, sessions as never, jwt);

  beforeEach(() => jest.clearAllMocks());

  it('rejects an existing registration email', async () => {
    users.exists.mockResolvedValue(true);
    await expect(service.register('trader@example.com', 'a-long-secure-password')).rejects.toThrow('Unable to create account');
  });

  it('rejects a refresh token that is not a refresh session', async () => {
    (jwt.verifyAsync as jest.Mock).mockResolvedValue({ sub: 'user-1', sid: 'session-1', type: 'access' });
    await expect(service.refresh('invalid-refresh-token')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
