'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Brand } from '../../../components/brand';
import { login } from '../../../lib/api';

export default function LoginPage() {
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
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

  return <main className="auth-page"><form className="auth-card" onSubmit={submit} noValidate><Brand /><p className="eyebrow">WELCOME BACK</p><h1>Continue your process.</h1><p className="auth-copy">Pick up your research workspace and review your framework with clarity.</p><label>Email address<input name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></label><label>Password<input name="password" type="password" autoComplete="current-password" placeholder="Your password" required /></label><Link className="text-link" href="/forgot-password">Forgot password?</Link><button className="button" disabled={pending} type="submit">{pending ? 'Signing in…' : 'Sign in'}</button><p className={`form-status${message ? ' is-error' : ''}`} role="status">{message}</p><Link href="/register">Need an account? Create one</Link></form></main>;
}
