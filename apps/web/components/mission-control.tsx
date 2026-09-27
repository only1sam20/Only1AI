'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

type Dashboard = {
  greetingName: string;
  onboarding: { key: string; label: string; complete: boolean }[];
  metrics: { activeCores: number; activeStrategies: number; monitoredMarkets: number; opportunityZones: number };
};

const destinations: Record<string, string> = { profile: '/profile', core: '/only1core', strategy: '/strategies', scanner: '/market-scanner' };

export function MissionControl() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Dashboard>('/dashboard/mission-control')
      .then(setDashboard)
      .catch(() => setMessage('Sign in to see your live workspace setup.'))
      .finally(() => setLoading(false));
  }, []);

  const metrics = dashboard
    ? [[dashboard.metrics.activeCores, 'Active Cores'], [dashboard.metrics.activeStrategies, 'Active Strategies'], [dashboard.metrics.monitoredMarkets, 'Active Monitors'], [dashboard.metrics.opportunityZones, 'Opportunity Zones']]
    : [['—', 'Active Cores'], ['—', 'Active Strategies'], ['—', 'Active Monitors'], ['—', 'Opportunity Zones']];

  return <><p className="page-lead">{dashboard ? `Welcome back, ${dashboard.greetingName}. Build your process deliberately, then review its confluence in the context you defined.` : 'A calm workspace for your methodology. Sign in to create an Only1Core, define its rules, and track your setup progress.'}</p>
    <section className="stat-grid" aria-label="Workspace metrics">{metrics.map(([value, label]) => <article key={String(label)}><strong>{value}</strong><span>{label}</span></article>)}</section>
    {loading ? <div className="loading-panel" aria-label="Loading onboarding"><div className="skeleton" /><div className="skeleton" /></div> : <><section className="setup-next"><div><p className="eyebrow">START HERE</p><h2>Build your analysis system.</h2></div><ol>{dashboard?.onboarding.map((item, index) => <li key={item.key}><span>{String(index + 1).padStart(2, '0')}</span><div><h3>{item.label}</h3><p>{item.complete ? 'Complete' : 'Complete this step to unlock the next layer of your workspace.'}</p></div><Link href={destinations[item.key]} aria-label={`${item.complete ? 'Review' : 'Complete'} ${item.label}`}>{item.complete ? '✓' : '→'}</Link></li>) ?? <li><span>01</span><div><h3>Sign in to start</h3><p>Your setup progress will appear here after you sign in.</p></div><Link href="/login" aria-label="Sign in">→</Link></li>}</ol></section><section className="opportunity-empty"><p className="eyebrow">OPPORTUNITY ZONES</p><h2>Nothing to review yet.</h2><p>Opportunity zones will appear after live market data and scheduled scanning are connected. For now, build your framework and save manual confluence reviews.</p></section></>}
    <p className={`form-status${message ? ' is-error' : ''}`} role="status">{message}</p>
  </>;
}
