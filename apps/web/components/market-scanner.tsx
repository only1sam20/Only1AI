'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api, MarketMonitor, Only1Core, Strategy } from '../lib/api';

export function MarketScanner() {
  const [cores, setCores] = useState<Only1Core[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [monitors, setMonitors] = useState<MarketMonitor[]>([]);
  const [selectedCoreId, setSelectedCoreId] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api<Only1Core[]>('/only1-cores'), api<Strategy[]>('/strategies'), api<MarketMonitor[]>('/market-monitors')])
      .then(([loadedCores, loadedStrategies, loadedMonitors]) => {
        setCores(loadedCores); setStrategies(loadedStrategies); setMonitors(loadedMonitors); setSelectedCoreId(loadedCores[0]?.id ?? '');
      })
      .catch(() => setMessage('Sign in and configure an Only1Core before adding markets.'))
      .finally(() => setLoading(false));
  }, []);

  const matchingStrategies = useMemo(() => strategies.filter((strategy) => strategy.only1CoreId === selectedCoreId), [selectedCoreId, strategies]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      const monitor = await api<MarketMonitor>('/market-monitors', { method: 'POST', body: JSON.stringify({ only1CoreId: selectedCoreId, strategyId: form.get('strategyId') || undefined, symbol: form.get('symbol'), marketType: form.get('marketType'), timeframe: form.get('timeframe') }) });
      setMonitors((current) => [monitor, ...current]);
      event.currentTarget.reset();
      setMessage('Market monitor created in paused mode. It will remain a configuration until live data is connected.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not add a market monitor.');
    } finally {
      setPending(false);
    }
  }

  async function toggleMonitor(monitor: MarketMonitor) {
    setUpdatingId(monitor.id);
    try {
      const status = monitor.status === 'active' ? 'paused' : 'active';
      const updated = await api<MarketMonitor>(`/market-monitors/${monitor.id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setMonitors((current) => current.map((item) => item.id === updated.id ? updated : item));
      setMessage(status === 'active' ? 'Monitor marked active and ready for the upcoming data connection.' : 'Monitor paused.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update this monitor.');
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) return <div className="loading-panel" aria-label="Loading market monitors"><div className="skeleton" /><div className="skeleton" /></div>;
  if (!cores.length) return <section className="manager-panel"><div className="empty-inline"><p className="eyebrow">FIRST STEP</p><h3>Create an Only1Core to build a watchlist</h3><p>Market monitors are intentionally attached to an individual analysis workspace.</p><Link className="button" href="/only1core">Create an Only1Core</Link></div><p className="form-status is-error" role="status">{message}</p></section>;

  return <section className="manager-panel"><div className="manager-heading"><div><p className="eyebrow">YOUR WATCHLIST</p><h2>Monitor only what matters</h2></div><span className="count-tag">{monitors.length} markets</span></div>
    <form className="inline-form strategy-form" onSubmit={submit}><div className="form-row"><label>Only1Core<select name="only1CoreId" value={selectedCoreId} onChange={(event) => setSelectedCoreId(event.target.value)} required>{cores.map((core) => <option key={core.id} value={core.id}>{core.name}</option>)}</select></label><label>Strategy <span>optional</span><select name="strategyId" defaultValue=""><option value="">No strategy selected</option>{matchingStrategies.map((strategy) => <option key={strategy.id} value={strategy.id}>{strategy.name}</option>)}</select></label></div><div className="form-row"><label>Symbol<input name="symbol" placeholder="EUR/USD or AAPL" maxLength={32} required /></label><label>Market<select name="marketType" defaultValue="forex"><option value="forex">Forex</option><option value="crypto">Crypto</option><option value="equity">Equity</option><option value="index">Index</option><option value="commodity">Commodity</option></select></label></div><label>Timeframe<input name="timeframe" placeholder="e.g. 15m" maxLength={32} required /></label><button className="button" disabled={pending} type="submit">{pending ? 'Adding monitor…' : 'Add paused monitor'}</button></form>
    {monitors.length > 0 && <div className="core-list">{monitors.map((monitor) => <article key={monitor.id}><div><strong>{monitor.symbol}</strong><p>{monitor.marketType} · {monitor.timeframe}</p></div><div className="row-actions"><span className={`status-badge${monitor.status === 'paused' ? ' is-muted' : ''}`}>{monitor.status}</span><button className="button-quiet" disabled={updatingId === monitor.id} onClick={() => toggleMonitor(monitor)} type="button">{updatingId === monitor.id ? 'Updating…' : monitor.status === 'active' ? 'Pause' : 'Mark active'}</button></div></article>)}</div>}
    <p className={`form-status${message && (message.includes('Could not') || message.includes('Sign in')) ? ' is-error' : message ? ' is-success' : ''}`} role="status">{message}</p>
  </section>;
}
