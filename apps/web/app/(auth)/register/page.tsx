'use client';

import { FormEvent, useState } from 'react';

export default function RegisterPage() {
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: form.get('email'), password: form.get('password') }) });
    const body = await response.json().catch(() => ({}));
    setMessage(response.ok ? body.message : 'Registration could not be completed. Check your details and try again.');
  }
  return <main><form onSubmit={submit}><h1>Create your Only1AI account</h1><label>Email<input name="email" type="email" required /></label><label>Password<input name="password" type="password" minLength={12} required /></label><button type="submit">Create account</button><p role="status">{message}</p></form></main>;
}
