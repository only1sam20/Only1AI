import { ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MAX_LENGTH = 72;
// bcrypt only processes the first 72 UTF-8 bytes, not 72 JavaScript characters.
export const PASSWORD_MAX_BYTES = 72;

export const PASSWORD_POLICY_MESSAGE =
  'Password must be 6 to 72 characters, no more than 72 UTF-8 bytes, and include uppercase, lowercase, a number, and a special character.';

// A space is deliberately not considered a special character. This keeps the
// requirement clear while still allowing passphrases that contain spaces.
export const PASSWORD_COMPLEXITY_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s])[\s\S]+$/;

@ValidatorConstraint({ name: 'passwordMaxBytes' })
export class PasswordMaxBytesConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && Buffer.byteLength(value, 'utf8') <= PASSWORD_MAX_BYTES;
  }

  defaultMessage(): string {
    return `Password must be no more than ${PASSWORD_MAX_BYTES} UTF-8 bytes.`;
  }
}

export function hasStrongPassword(password: string): boolean {
  const length = Array.from(password).length;
  return length >= PASSWORD_MIN_LENGTH
    && length <= PASSWORD_MAX_LENGTH
    && Buffer.byteLength(password, 'utf8') <= PASSWORD_MAX_BYTES
    && PASSWORD_COMPLEXITY_PATTERN.test(password);
}
