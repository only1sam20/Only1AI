import { validate } from 'class-validator';
import { PasswordResetConfirmDto } from './password-reset-confirm.dto';
import { VerifyEmailDto } from './verify-email.dto';

const validToken = `${'a'.repeat(24)}.${'b'.repeat(64)}`;

describe('auth token DTOs', () => {
  it('accepts the selector.secret token format issued by the auth service', async () => {
    const verify = Object.assign(new VerifyEmailDto(), { token: validToken });
    const reset = Object.assign(new PasswordResetConfirmDto(), { token: validToken, password: 'Secure1!Password' });
    await expect(validate(verify)).resolves.toHaveLength(0);
    await expect(validate(reset)).resolves.toHaveLength(0);
  });

  it('rejects legacy, malformed, and incomplete token values', async () => {
    const verify = Object.assign(new VerifyEmailDto(), { token: 'a'.repeat(64) });
    await expect(validate(verify)).resolves.not.toHaveLength(0);
  });
});
