'use client';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '../../../lib/api';

export default function LoginPage() {
  const [message, setMessage] = useState(''); const [pending, setPending] = useState(false); const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setPending(true); const form = new FormData(event.currentTarget); try { await login(String(form.get('email')), String(form.get('password'))); router.push('/mission-control'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to sign in.'); } finally { setPending(false); } }
  return <main className="auth-page"><form className="auth-card" onSubmit={submit}><a className="brand" href="/"><span>01</span>ONLY1AI</a><p className="eyebrow">WELCOME BACK</p><h1>Continue your process.</h1><label>Email<input name="email" type="email" autoComplete="email" required /></label><label>Password<input name="password" type="password" autoComplete="current-password" required /></label><button className="button" disabled={pending} type="submit">{pending ? 'Signing in…' : 'Sign in →'}</button><p role="status">{message}</p><a href="/register">Need an account? Create one</a></form></main>;
}
