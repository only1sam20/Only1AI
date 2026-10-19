import { validate } from 'class-validator';
import { PreferredStrategy, PreferredTrade } from '../users/entities/user-profile.entity';
import { LoginDto } from './dto/login.dto';
import { PasswordResetConfirmDto } from './dto/password-reset-confirm.dto';
import { RegisterDto } from './dto/register.dto';
import { hasStrongPassword, PASSWORD_MAX_BYTES } from './password-policy';

const token = `${'a'.repeat(24)}.${'b'.repeat(64)}`;
const registration = (password: string) => Object.assign(new RegisterDto(), {
  email: 'trader@example.com', password, traderName: 'Trader',
  preferredTrade: PreferredTrade.FOREX, preferredStrategy: PreferredStrategy.SMC,
});
const reset = (password: string) => Object.assign(new PasswordResetConfirmDto(), { token, password });

describe('password byte limit', () => {
  it.each([
    ['ASCII at the limit', `Aa1!${'a'.repeat(68)}`, true],
    ['ASCII above the limit', `Aa1!${'a'.repeat(69)}`, false],
    ['multibyte at the limit', `Aa1!${'é'.repeat(34)}`, true],
    ['multibyte above the limit', `Aa1!${'é'.repeat(35)}`, false],
  ] as const)('validates %s for registration and password reset', async (_description, password, accepted) => {
    expect(PASSWORD_MAX_BYTES).toBe(72);
    expect(hasStrongPassword(password)).toBe(accepted);
    for (const dto of [registration(password), reset(password)]) {
      const errors = await validate(dto);
      expect(errors.some((error) => error.property === 'password')).toBe(!accepted);
    }
  });

  it('retains support for legacy passwords longer than 72 bytes at login', async () => {
    const login = Object.assign(new LoginDto(), { email: 'trader@example.com', password: `Aa1!${'a'.repeat(100)}` });
    await expect(validate(login)).resolves.toHaveLength(0);
  });
});
