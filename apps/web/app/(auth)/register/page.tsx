'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { Brand } from '../../../components/brand';
import { register } from '../../../lib/api';

export default function RegisterPage() {
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      const result = await register(String(form.get('email')), String(form.get('password')));
      setMessage(result.message);
      setComplete(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Registration could not be completed. Check your details and try again.');
    } finally {
      setPending(false);
    }
  }

  return <main className="auth-page"><form className="auth-card" onSubmit={submit} noValidate><Brand /><p className="eyebrow">CREATE YOUR WORKSPACE</p><h1>Build your Only1Core.</h1><p className="auth-copy">Start with your methodology. Only1AI will never execute a trade or replace your judgement.</p><label>Email address<input name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></label><label>Password<input name="password" type="password" autoComplete="new-password" minLength={12} placeholder="At least 12 characters" required /></label><p className="password-note">Use at least 12 characters. Never reuse a password from another service.</p><button className="button" disabled={pending || complete} type="submit">{complete ? 'Account request received' : pending ? 'Creating account…' : 'Create account'}</button><p className={`form-status${message && !complete ? ' is-error' : complete ? ' is-success' : ''}`} role="status">{message}</p><Link href="/login">Already have an account? Sign in</Link></form></main>;
}
