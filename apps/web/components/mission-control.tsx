'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

type Dashboard = { greetingName: string; onboarding: { key: string; label: string; complete: boolean }[]; metrics: { activeCores: number; activeStrategies: number; monitoredMarkets: number; opportunityZones: number } };
const destinations: Record<string, string> = { profile: '/profile', core: '/only1core', strategy: '/strategies', scanner: '/market-scanner' };

export function MissionControl() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null); const [message, setMessage] = useState('');
  useEffect(() => { api<Dashboard>('/dashboard/mission-control').then(setDashboard).catch(() => setMessage('Sign in to see your live workspace.')); }, []);
  const metrics = dashboard ? [[dashboard.metrics.activeCores, 'Active Cores'], [dashboard.metrics.activeStrategies, 'Strategies'], [dashboard.metrics.monitoredMarkets, 'Markets Monitored'], [dashboard.metrics.opportunityZones, 'Opportunity Zones']] : [['--', 'Active Cores'], ['--', 'Strategies'], ['--', 'Markets Monitored'], ['--', 'Opportunity Zones']];
  return <><p className="page-lead">{dashboard ? `Welcome, ${dashboard.greetingName}. Configure your Only1Core, then review confluence in the context you defined.` : 'A calm workspace for your methodology. Configure your Only1Core, then review confluence in the context you defined.'}</p><section className="stat-grid">{metrics.map(([value, label]) => <article key={String(label)}><strong>{value}</strong><span>{label}</span></article>)}</section><section className="setup-next"><div><p className="eyebrow">START HERE</p><h2>Build your analysis system.</h2></div><ol>{dashboard?.onboarding.map((item, index) => <li key={item.key}><span>{String(index + 1).padStart(2, '0')}</span><div><h3>{item.label}</h3><p>{item.complete ? 'Complete' : 'Complete this step to unlock the next layer of your workspace.'}</p></div><Link href={destinations[item.key]}>{item.complete ? '✓' : '→'}</Link></li>) ?? <li><span>01</span><div><h3>Sign in to start</h3><p>Your setup progress will appear here.</p></div><Link href="/login">→</Link></li>}</ol></section><section className="opportunity-empty"><p className="eyebrow">OPPORTUNITY ZONES</p><h2>Nothing to review yet.</h2><p>Opportunity zones appear here after you connect an Only1Core, strategy, and market monitor.</p></section><p className="form-status" role="status">{message}</p></>;
}
