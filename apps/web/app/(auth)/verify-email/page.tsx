'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Brand } from '../../../components/brand';
import { verifyEmail } from '../../../lib/api';

export default function VerifyEmailPage() {
  const [state, setState] = useState<'verifying' | 'verified' | 'error'>('verifying');
  const [message, setMessage] = useState('Verifying your email address…');

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) { setState('error'); setMessage('This verification link is incomplete or invalid.'); return; }
    verifyEmail(token)
      .then(() => { setState('verified'); setMessage('Your email is verified. You can now sign in to your workspace.'); })
      .catch(() => { setState('error'); setMessage('This verification link is invalid or has expired. Request a new account email from the registration page.'); });
  }, []);

  return <main className="auth-page"><section className="auth-card"><Brand /><p className="eyebrow">ACCOUNT VERIFICATION</p><h1>{state === 'verified' ? 'You are verified.' : state === 'error' ? 'Verification unavailable.' : 'One moment.'}</h1><p className={`auth-copy${state === 'error' ? ' is-error' : ''}`}>{message}</p>{state === 'verified' ? <Link className="button" href="/login">Sign in</Link> : <Link className="button-secondary" href="/register">Return to registration</Link>}</section></main>;
}
