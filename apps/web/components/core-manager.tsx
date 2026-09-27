'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, Only1Core } from '../lib/api';

export function CoreManager() {
  const [cores, setCores] = useState<Only1Core[]>([]);
  const [message, setMessage] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    api<Only1Core[]>('/only1-cores')
      .then(setCores)
      .catch(() => setMessage('Sign in to create and manage your Only1Cores.'))
      .finally(() => setLoading(false));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      const core = await api<Only1Core>('/only1-cores', { method: 'POST', body: JSON.stringify({ name: form.get('name'), description: form.get('description') }) });
      setCores((current) => [core, ...current]);
      setOpen(false);
      setMessage('Only1Core created in paused mode. Add a strategy when you are ready.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not create an Only1Core.');
    } finally {
      setPending(false);
    }
  }

  async function toggleCore(core: Only1Core) {
    setUpdatingId(core.id);
    setMessage('');
    try {
      const status = core.status === 'active' ? 'paused' : 'active';
      const updated = await api<Only1Core>(`/only1-cores/${core.id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setCores((current) => current.map((item) => item.id === updated.id ? updated : item));
      setMessage(status === 'active' ? 'Core marked active. Live scanning will be connected in the next delivery phase.' : 'Core paused.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update this Only1Core.');
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) return <div className="loading-panel" aria-label="Loading Only1Cores"><div className="skeleton" /><div className="skeleton" /></div>;

  return <section className="manager-panel"><div className="manager-heading"><div><p className="eyebrow">YOUR ONLY1CORES</p><h2>{cores.length ? `${cores.length} configured` : 'Create your first Only1Core'}</h2></div><button className="button button-small" onClick={() => setOpen((visible) => !visible)} type="button">{open ? 'Cancel' : 'Create Only1Core'}</button></div>
    {open && <form className="inline-form" onSubmit={submit}><label>Name<input name="name" minLength={3} maxLength={80} placeholder="e.g. London Open" autoFocus required /></label><label>Description <span>optional</span><input name="description" maxLength={500} placeholder="What does this core focus on?" /></label><button className="button" disabled={pending} type="submit">{pending ? 'Creating…' : 'Create paused core'}</button></form>}
    {!cores.length && !message && <div className="empty-inline"><h3>Start with one clear process</h3><p>An Only1Core is a private workspace for a market methodology you want to review consistently.</p></div>}
    {cores.length > 0 && <div className="core-list">{cores.map((core) => <article key={core.id}><div><strong>{core.name}</strong><p>{core.description || 'No description yet.'} · Checks every {core.analysisIntervalMinutes} minutes once live scanning is enabled.</p></div><div className="row-actions"><span className={`status-badge${core.status === 'paused' ? ' is-muted' : ''}`}>{core.status}</span><button className="button-quiet" disabled={updatingId === core.id} onClick={() => toggleCore(core)} type="button">{updatingId === core.id ? 'Updating…' : core.status === 'active' ? 'Pause' : 'Mark active'}</button></div></article>)}</div>}
    <p className={`form-status${message && message.includes('Could not') || message.includes('Sign in') ? ' is-error' : message ? ' is-success' : ''}`} role="status">{message}</p>
  </section>;
}
