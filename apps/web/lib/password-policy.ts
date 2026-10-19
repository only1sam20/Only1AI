export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MAX_BYTES = 72;
// A 72-byte password cannot contain more than 72 UTF-16 code units. The byte
// check below is still required because Unicode characters can use more bytes.
export const PASSWORD_MAX_LENGTH = PASSWORD_MAX_BYTES;

export function passwordChecks(password: string) {
  return [
    { label: `At least ${PASSWORD_MIN_LENGTH} characters, at most ${PASSWORD_MAX_BYTES} UTF-8 bytes`, passed: Array.from(password).length >= PASSWORD_MIN_LENGTH && new TextEncoder().encode(password).length <= PASSWORD_MAX_BYTES },
    { label: 'An uppercase letter', passed: /[A-Z]/.test(password) },
    { label: 'A lowercase letter', passed: /[a-z]/.test(password) },
    { label: 'A number', passed: /\d/.test(password) },
    { label: 'A special character', passed: /[^A-Za-z0-9\s]/.test(password) },
  ];
}

export function hasStrongPassword(password: string): boolean {
  return passwordChecks(password).every((check) => check.passed);
}
