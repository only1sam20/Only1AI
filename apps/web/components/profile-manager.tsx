'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api, CurrentUser, UserProfile } from '../lib/api';

const blankProfile: UserProfile = { displayName: '', timezone: '', bio: '' };

export function ProfileManager() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [profile, setProfile] = useState<UserProfile>(blankProfile);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api<CurrentUser>('/users/me')
      .then((currentUser) => {
        if (!mounted) return;
        setUser(currentUser);
        setProfile(currentUser.profile ?? blankProfile);
      })
      .catch(() => { if (mounted) setMessage('Sign in to personalise your workspace.'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const initials = useMemo(() => (profile.displayName || user?.email || '01').slice(0, 2).toUpperCase(), [profile.displayName, user?.email]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage('');
    try {
      const saved = await api<UserProfile>('/users/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({ displayName: profile.displayName, timezone: profile.timezone, bio: profile.bio }),
      });
      setProfile(saved);
      setMessage('Your workspace profile has been saved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Your profile could not be saved.');
    } finally {
      setPending(false);
    }
  }

  if (loading) return <div className="loading-panel" aria-label="Loading profile"><div className="skeleton" /><div className="skeleton" /></div>;
  if (!user) return <section className="empty-panel"><span className="empty-icon">→</span><h2>Sign in to make it yours</h2><p>Set a display name, timezone, and workspace context after you sign in.</p><a className="button" href="/login">Sign in</a></section>;

  return <>
    <section className="profile-card">
      <div className="avatar">{initials}</div>
      <div><h2>{profile.displayName || 'Your Only1AI profile'}</h2><p>{user.email}</p></div>
      <span className={`status-badge${user.emailVerifiedAt ? '' : ' is-warning'}`}>{user.emailVerifiedAt ? 'Email verified' : 'Verification pending'}</span>
    </section>
    <form className="profile-form" onSubmit={submit}>
      <fieldset className="form-controls" disabled={pending}>
      <div className="form-row">
        <label>Display name<input value={profile.displayName ?? ''} onChange={(event) => setProfile((current) => ({ ...current, displayName: event.target.value }))} maxLength={80} placeholder="e.g. Sam" autoComplete="name" /></label>
        <label>Timezone<input value={profile.timezone ?? ''} onChange={(event) => setProfile((current) => ({ ...current, timezone: event.target.value }))} maxLength={64} placeholder="e.g. Africa/Lagos" /></label>
      </div>
      <label>Workspace note <span className="form-hint">optional</span><textarea value={profile.bio ?? ''} onChange={(event) => setProfile((current) => ({ ...current, bio: event.target.value }))} maxLength={500} placeholder="What kind of market process are you building?" /></label>
      <button className="button" disabled={pending} type="submit">{pending ? 'Saving profile…' : 'Save profile'}</button>
      <p className={`form-status${message && !message.includes('saved') ? ' is-error' : message ? ' is-success' : ''}`} role="status">{message}</p>
      </fieldset>
    </form>
  </>;
}
