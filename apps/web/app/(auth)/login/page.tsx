'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Brand } from '../../../components/brand';
import { login } from '../../../lib/api';

export default function LoginPage() {
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      await login(String(form.get('email')), String(form.get('password')));
      const returnTo = new URLSearchParams(window.location.search).get('returnTo');
      const safeReturnTo = returnTo?.startsWith('/') && !returnTo.startsWith('//')
        ? returnTo
        : '/mission-control';
      router.push(safeReturnTo);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to sign in.');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={submit} noValidate>
        <Brand />
        <p className="eyebrow">WELCOME BACK</p>
        <h1>Continue your process.</h1>
        <p className="auth-copy">Pick up your research workspace and review your framework with clarity.</p>
        <label htmlFor="login-email">Email address
          <input id="login-email" name="email" type="email" autoComplete="email" maxLength={254} placeholder="you@example.com" required />
        </label>
        <label htmlFor="login-password">Password
          <span className="password-input-wrap">
            <input id="login-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" maxLength={128} placeholder="Your password" required />
            <button className="password-toggle" type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? 'Hide' : 'Show'}</button>
          </span>
        </label>
        <Link className="text-link" href="/forgot-password">Forgot password?</Link>
        <button className="button" disabled={pending} type="submit">{pending ? 'Signing in...' : 'Sign in'}</button>
        <p className={`form-status${message ? ' is-error' : ''}`} role="status">{message}</p>
        <Link href="/register">Need an account? Create one</Link>
      </form>
    </main>
  );
}
