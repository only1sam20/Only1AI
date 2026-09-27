export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MAX_LENGTH = 128;

export const PASSWORD_POLICY_MESSAGE =
  'Password must be 6 to 128 characters and include uppercase, lowercase, a number, and a special character.';

// A space is deliberately not considered a special character. This keeps the
// requirement clear while still allowing passphrases that contain spaces.
export const PASSWORD_COMPLEXITY_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s])[\s\S]+$/;

export function hasStrongPassword(password: string): boolean {
  return password.length >= PASSWORD_MIN_LENGTH
    && password.length <= PASSWORD_MAX_LENGTH
    && PASSWORD_COMPLEXITY_PATTERN.test(password);
}
