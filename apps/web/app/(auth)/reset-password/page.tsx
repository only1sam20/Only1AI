'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { Brand } from '../../../components/brand';
import { resetPassword } from '../../../lib/api';

export default function ResetPasswordPage() {
  const [token, setToken] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);

  useEffect(() => setToken(new URLSearchParams(window.location.search).get('token')), []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) { setMessage('This reset link is incomplete or invalid.'); return; }
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password'));
    const confirmation = String(form.get('confirmation'));
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

  return <main className="auth-page"><form className="auth-card" onSubmit={submit} noValidate><Brand /><p className="eyebrow">ACCOUNT RECOVERY</p><h1>Choose a new password.</h1><p className="auth-copy">Use a new, unique password with at least 12 characters. Reset links can only be used once.</p><label>New password<input name="password" type="password" autoComplete="new-password" minLength={12} placeholder="At least 12 characters" disabled={!token || complete} required /></label><label>Confirm new password<input name="confirmation" type="password" autoComplete="new-password" minLength={12} placeholder="Repeat your password" disabled={!token || complete} required /></label><button className="button" disabled={!token || pending || complete} type="submit">{complete ? 'Password reset' : pending ? 'Resetting password…' : 'Reset password'}</button><p className={`form-status${message && !complete ? ' is-error' : complete ? ' is-success' : ''}`} role="status">{message || (!token ? 'Checking your reset link…' : '')}</p>{complete ? <Link href="/login">Sign in</Link> : <Link href="/forgot-password">Request another reset link</Link>}</form></main>;
}
