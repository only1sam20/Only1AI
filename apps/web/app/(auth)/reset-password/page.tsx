'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { Brand } from '../../../components/brand';
import { resetPassword } from '../../../lib/api';

const PASSWORD_MIN_LENGTH = 6;
const PASSWORD_MAX_LENGTH = 128;
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s])[\s\S]+$/;

function hasStrongPassword(password: string): boolean {
  return password.length >= PASSWORD_MIN_LENGTH
    && password.length <= PASSWORD_MAX_LENGTH
    && passwordPattern.test(password);
}

export default function ResetPasswordPage() {
  const [token, setToken] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => setToken(new URLSearchParams(window.location.search).get('token')), []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) { setMessage('This reset link is incomplete or invalid.'); return; }
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password'));
    const confirmation = String(form.get('confirmation'));
    if (!hasStrongPassword(password)) {
      setMessage('Use 6 to 128 characters with uppercase, lowercase, a number, and a special character.');
      return;
    }
    if (password !== confirmation) { setMessage('The passwords do not match.'); return; }
    setPending(true);
    setMessage('');
    try {
      await resetPassword(token, password);
      setComplete(true);
      setMessage('Your password has been reset. You can now sign in.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'This reset link is invalid or has expired.');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={submit} noValidate>
        <Brand />
        <p className="eyebrow">ACCOUNT RECOVERY</p>
        <h1>Choose a new password.</h1>
        <p className="auth-copy">Use a unique 6-128 character password with uppercase, lowercase, a number, and a special character. Reset links can only be used once.</p>
        <label htmlFor="reset-password">New password
          <span className="password-input-wrap">
            <input id="reset-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} maxLength={PASSWORD_MAX_LENGTH} placeholder="Create a strong password" disabled={!token || complete} required />
            <button className="password-toggle" type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} disabled={!token || complete} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? 'Hide' : 'Show'}</button>
          </span>
        </label>
        <label htmlFor="reset-confirmation">Confirm new password
          <span className="password-input-wrap">
            <input id="reset-confirmation" name="confirmation" type={showConfirmation ? 'text' : 'password'} autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} maxLength={PASSWORD_MAX_LENGTH} placeholder="Re-enter your password" disabled={!token || complete} required />
            <button className="password-toggle" type="button" aria-label={showConfirmation ? 'Hide confirmation password' : 'Show confirmation password'} aria-pressed={showConfirmation} disabled={!token || complete} onClick={() => setShowConfirmation((visible) => !visible)}>{showConfirmation ? 'Hide' : 'Show'}</button>
          </span>
        </label>
        <button className="button" disabled={!token || pending || complete} type="submit">{complete ? 'Password reset' : pending ? 'Resetting password...' : 'Reset password'}</button>
        <p className={`form-status${message && !complete ? ' is-error' : complete ? ' is-success' : ''}`} role="status">{message || (!token ? 'Checking your reset link...' : '')}</p>
        {complete ? <Link href="/login">Sign in</Link> : <Link href="/forgot-password">Request another reset link</Link>}
      </form>
    </main>
  );
}
