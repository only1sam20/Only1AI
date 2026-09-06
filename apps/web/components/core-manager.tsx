'use client';
import { FormEvent, useEffect, useState } from 'react';
import { api, Only1Core } from '../lib/api';

export function CoreManager() {
  const [cores, setCores] = useState<Only1Core[]>([]); const [message, setMessage] = useState(''); const [open, setOpen] = useState(false);
  useEffect(() => { api<Only1Core[]>('/only1-cores').then(setCores).catch(() => setMessage('Sign in to view and manage your Only1Cores.')); }, []);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); try { const core = await api<Only1Core>('/only1-cores', { method: 'POST', body: JSON.stringify({ name: form.get('name'), description: form.get('description') }) }); setCores((current) => [core, ...current]); setOpen(false); setMessage('Only1Core created in paused mode.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not create Only1Core.'); } }
  return <section className="manager-panel"><div className="manager-heading"><div><p className="eyebrow">YOUR ONLY1CORES</p><h2>{cores.length ? `${cores.length} configured` : 'Create your first Only1Core'}</h2></div><button className="button button-small" onClick={() => setOpen(!open)} type="button">{open ? 'Cancel' : 'Create Only1Core'}</button></div>{open && <form className="inline-form" onSubmit={submit}><label>Name<input name="name" minLength={3} maxLength={80} placeholder="e.g. London Open" required /></label><label>Description <span>optional</span><input name="description" maxLength={500} placeholder="What does this core focus on?" /></label><button className="button" type="submit">Create paused core →</button></form>}{cores.length > 0 && <div className="core-list">{cores.map((core) => <article key={core.id}><div><strong>{core.name}</strong><p>{core.description ?? 'No description yet.'}</p></div><span>{core.status}</span></article>)}</div>}<p className="form-status" role="status">{message}</p></section>;
}
