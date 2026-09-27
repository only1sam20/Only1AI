import { Logger } from '@nestjs/common';
import { AuthEmailService } from './auth-email.service';

describe('AuthEmailService', () => {
  const originalEnvironment = { ...process.env };
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.restoreAllMocks();
    process.env = { ...originalEnvironment };
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
    process.env.WEB_ORIGIN = 'https://app.only1ai.test';
    process.env.NODE_ENV = 'development';
  });

  afterAll(() => {
    process.env = originalEnvironment;
    global.fetch = originalFetch;
  });

  it('sends a verification email through Resend without exposing the API key in the payload', async () => {
    process.env.RESEND_API_KEY = 're_test_key';
    process.env.EMAIL_FROM = 'Only1AI <team@only1ai.test>';
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock;
    const service = new AuthEmailService();

    await service.sendEmailVerification('trader@example.com', 'a'.repeat(64));

    expect(fetchMock).toHaveBeenCalledWith('https://api.resend.com/emails', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer re_test_key' }),
    }));
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(request.body).toContain('trader@example.com');
    expect(request.body).toContain('https://app.only1ai.test/verify-email?token=');
    expect(request.body).not.toContain('re_test_key');
  });

  it('logs a development-only verification link when Resend is not configured', async () => {
    const warning = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const service = new AuthEmailService();

    await service.sendEmailVerification('trader@example.com', 'a'.repeat(64));

    expect(warning).toHaveBeenCalledWith(expect.stringContaining('Development email verification link'));
  });

  it('sends password reset links through the same server-side delivery path', async () => {
    process.env.RESEND_API_KEY = 're_test_key';
    process.env.EMAIL_FROM = 'Only1AI <team@only1ai.test>';
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock;
    const service = new AuthEmailService();

    await service.sendPasswordReset('trader@example.com', 'b'.repeat(64));

    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(request.body).toContain('Reset your Only1AI password');
    expect(request.body).toContain('https://app.only1ai.test/reset-password?token=');
  });

  it('does not allow a production fallback without Resend', async () => {
    process.env.NODE_ENV = 'production';
    const service = new AuthEmailService();

    await expect(service.sendEmailVerification('trader@example.com', 'a'.repeat(64))).rejects.toThrow('RESEND_API_KEY');
  });
});
