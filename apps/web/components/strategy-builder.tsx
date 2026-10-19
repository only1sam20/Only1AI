'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { api, Only1Core, Strategy, StrategyRule } from '../lib/api';

type RuleDraft = Pick<StrategyRule, 'category' | 'condition' | 'priority' | 'value'>;
const emptyRule = (): RuleDraft => ({ category: '', condition: '', priority: 70 });

export function StrategyBuilder() {
  const [cores, setCores] = useState<Only1Core[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [rules, setRules] = useState<RuleDraft[]>([emptyRule()]);
  const [editing, setEditing] = useState<Strategy | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const editRequest = useRef(0);

  useEffect(() => {
    let mounted = true;
    Promise.all([api<Only1Core[]>('/only1-cores'), api<Strategy[]>('/strategies')])
      .then(([loadedCores, loadedStrategies]) => { if (mounted) { setCores(loadedCores); setStrategies(loadedStrategies); } })
      .catch(() => { if (mounted) setMessage('Sign in and create an Only1Core before adding a strategy.'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; editRequest.current += 1; };
  }, []);

  function resetForm() { editRequest.current += 1; setUpdatingId(null); setEditing(null); setRules([emptyRule()]); }
  function updateRule(index: number, changes: Partial<RuleDraft>) { setRules((current) => current.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, ...changes } : rule)); }

  async function beginEdit(strategy: Strategy) {
    if (pending) return;
    const requestId = ++editRequest.current;
    setUpdatingId(strategy.id);
    setMessage('');
    try {
      const detail = await api<Strategy>(`/strategies/${strategy.id}`);
      if (requestId !== editRequest.current) return;
      setEditing(detail);
      setRules(detail.rules?.length ? detail.rules.map(({ category, condition, priority, value }) => ({ category, condition, priority, value })) : [emptyRule()]);
      document.getElementById('strategy-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      if (requestId === editRequest.current) setMessage(error instanceof Error ? error.message : 'Could not open this strategy.');
    } finally {
      if (requestId === editRequest.current) setUpdatingId(null);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (rules.some((rule) => !rule.category.trim() || !rule.condition.trim())) { setMessage('Add a category and condition for every rule before saving.'); return; }
    setPending(true);
    setMessage('');
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload = { only1CoreId: form.get('only1CoreId'), name: form.get('name'), timeframe: form.get('timeframe'), description: form.get('description'), rules };
    try {
      const strategy = editing
        ? await api<Strategy>(`/strategies/${editing.id}`, { method: 'PATCH', body: JSON.stringify({ name: payload.name, timeframe: payload.timeframe, description: payload.description, rules }) })
        : await api<Strategy>('/strategies', { method: 'POST', body: JSON.stringify(payload) });
      setStrategies((current) => editing ? current.map((item) => item.id === strategy.id ? strategy : item) : [strategy, ...current]);
      setMessage(editing ? 'Strategy and confluence rules updated.' : 'Draft strategy created. You can refine its rules at any time.');
      resetForm();
      formElement.reset();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save this strategy.');
    } finally {
      setPending(false);
    }
  }

  async function toggleStatus(strategy: Strategy) {
    if (pending) return;
    setUpdatingId(strategy.id);
    try {
      const status = strategy.status === 'active' ? 'draft' : 'active';
      const updated = await api<Strategy>(`/strategies/${strategy.id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setStrategies((current) => current.map((item) => item.id === updated.id ? updated : item));
      setMessage(status === 'active' ? 'Strategy marked active and ready for a future scanner connection.' : 'Strategy returned to draft.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update this strategy.');
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) return <div className="loading-panel" aria-label="Loading strategies"><div className="skeleton" /><div className="skeleton" /></div>;
  if (!cores.length) return <section className="manager-panel"><div className="empty-inline"><p className="eyebrow">FIRST STEP</p><h3>Create an Only1Core before defining rules</h3><p>Strategies belong to a private Only1Core, which keeps each market process clear and separate.</p><Link className="button" href="/only1core">Create an Only1Core</Link></div><p className="form-status is-error" role="status">{message}</p></section>;

  return <section className="manager-panel"><div className="manager-heading"><div><p className="eyebrow">YOUR STRATEGIES</p><h2>{editing ? `Editing ${editing.name}` : 'Build a clear framework'}</h2></div><span className="count-tag">{strategies.length} total</span></div>
    <form className="inline-form strategy-form" id="strategy-form" onSubmit={submit}>
      <fieldset className="form-controls" disabled={pending}>
      <label>Only1Core<select key={`${editing?.id ?? 'new'}-core`} name="only1CoreId" defaultValue={editing?.only1CoreId ?? cores[0]?.id} disabled={Boolean(editing)} required>{cores.map((core) => <option value={core.id} key={core.id}>{core.name}</option>)}</select></label>
      <label>Strategy name<input key={editing?.id ?? 'new-name'} name="name" defaultValue={editing?.name ?? ''} minLength={3} maxLength={100} placeholder="e.g. London breakout" required /></label>
      <div className="form-row"><label>Timeframe<input key={`${editing?.id ?? 'new'}-timeframe`} name="timeframe" defaultValue={editing?.timeframe ?? ''} placeholder="e.g. 15m" maxLength={32} /></label><label>Description <span>optional</span><input key={`${editing?.id ?? 'new'}-description`} name="description" defaultValue={editing?.description ?? ''} maxLength={1000} placeholder="What does this framework review?" /></label></div>
      <div className="rule-editor"><div className="manager-heading"><div><p className="eyebrow">CONFLUENCE RULES</p><p className="form-hint">Add every condition that matters to this strategy.</p></div><button className="button-secondary button-small" onClick={() => setRules((current) => [...current, emptyRule()])} type="button">Add rule</button></div>{rules.map((rule, index) => <div className="rule-row" key={`${editing?.id ?? 'new'}-${index}`}><span className="rule-index">{String(index + 1).padStart(2, '0')}</span><label>Category<input value={rule.category} onChange={(event) => updateRule(index, { category: event.target.value })} placeholder="e.g. session" maxLength={48} required /></label><label>Condition<input value={rule.condition} onChange={(event) => updateRule(index, { condition: event.target.value })} placeholder="e.g. London open" maxLength={120} required /></label><label>Priority<input value={rule.priority} onChange={(event) => updateRule(index, { priority: Number(event.target.value) })} type="number" min="1" max="100" required /></label>{rules.length > 1 && <button className="remove-rule" onClick={() => setRules((current) => current.filter((_, ruleIndex) => ruleIndex !== index))} type="button" aria-label={`Remove rule ${index + 1}`}>×</button>}</div>)}</div>
      <div className="form-actions"><button className="button" disabled={pending} type="submit">{pending ? 'Saving strategy…' : editing ? 'Save strategy' : 'Save draft strategy'}</button>{editing && <button className="button-secondary" onClick={resetForm} type="button">Cancel edit</button>}</div>
      </fieldset>
    </form>
    {strategies.length > 0 && <div className="core-list">{strategies.map((strategy) => <article key={strategy.id}><div><strong>{strategy.name}</strong><p>{strategy.timeframe || 'Timeframe not set'} · Attached to an Only1Core</p></div><div className="row-actions"><span className={`status-badge${strategy.status === 'draft' ? ' is-muted' : ''}`}>{strategy.status}</span><button className="button-quiet" disabled={pending || updatingId === strategy.id} onClick={() => beginEdit(strategy)} type="button">Edit rules</button><button className="button-quiet" disabled={pending || updatingId === strategy.id} onClick={() => toggleStatus(strategy)} type="button">{strategy.status === 'active' ? 'Set draft' : 'Mark active'}</button></div></article>)}</div>}
    <p className={`form-status${message && (message.includes('Could not') || message.includes('Sign in') || message.includes('Add a')) ? ' is-error' : message ? ' is-success' : ''}`} role="status">{message}</p>
  </section>;
}
