'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { Brand } from '../../../components/brand';
import { requestPasswordReset } from '../../../lib/api';

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage('');
    try {
      const form = new FormData(event.currentTarget);
      const result = await requestPasswordReset(String(form.get('email')));
      setMessage(result.message);
      setComplete(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'We could not process that request right now.');
    } finally {
      setPending(false);
    }
  }

  return <main className="auth-page"><form className="auth-card" onSubmit={submit} noValidate><Brand /><p className="eyebrow">ACCOUNT RECOVERY</p><h1>Reset your password.</h1><p className="auth-copy">Enter your account email. If an active account matches it, we will send secure reset instructions.</p><label>Email address<input name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></label><button className="button" disabled={pending || complete} type="submit">{complete ? 'Request received' : pending ? 'Sending instructions…' : 'Send reset instructions'}</button><p className={`form-status${message && !complete ? ' is-error' : complete ? ' is-success' : ''}`} role="status">{message}</p><Link href="/login">Return to sign in</Link></form></main>;
}
