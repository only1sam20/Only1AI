'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { api, Strategy } from '../lib/api';

type Assessment = { id: string; score: number; outcome: 'qualified' | 'insufficient' };
type Analysis = { id: string; title: string; summary: string; createdAt: string };

export function AnalysisWorkspace() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [message, setMessage] = useState('');
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api<Strategy[]>('/strategies'), api<Analysis[]>('/analyses?limit=20')])
      .then(([loadedStrategies, loadedAnalyses]) => { setStrategies(loadedStrategies); setAnalyses(loadedAnalyses); })
      .catch(() => setMessage('Sign in and create a strategy to begin an analysis.'))
      .finally(() => setLoading(false));
  }, []);

  async function evaluate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      const result = await api<Assessment>('/confluence-assessments', { method: 'POST', body: JSON.stringify({ strategyId: form.get('strategyId'), observations: [{ category: form.get('category'), condition: form.get('condition') }] }) });
      setAssessment(result);
      setMessage(result.outcome === 'qualified' ? 'Your supplied context meets the configured threshold. Review the evidence before making any decision.' : 'The supplied context does not meet the configured threshold.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not evaluate confluence.');
    } finally {
      setPending(false);
    }
  }

  async function generate() {
    if (!assessment) return;
    setPending(true);
    try {
      const analysis = await api<Analysis>(`/analyses/from-assessment/${assessment.id}`, { method: 'POST' });
      setAnalyses((current) => [analysis, ...current]);
      setMessage('Evidence-backed analysis saved. It is educational context, not trading advice.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not generate an explanation.');
    } finally {
      setPending(false);
    }
  }

  if (loading) return <div className="loading-panel" aria-label="Loading analysis workspace"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div>;
  if (!strategies.length) return <section className="manager-panel"><div className="empty-inline"><p className="eyebrow">FIRST STEP</p><h3>Create a strategy before reviewing confluence</h3><p>Analysis compares supplied market observations only against the rules you define.</p><Link className="button" href="/strategies">Create a strategy</Link></div><p className="form-status is-error" role="status">{message}</p></section>;

  return <><section className="manager-panel"><div className="manager-heading"><div><p className="eyebrow">CONFLUENCE REVIEW</p><h2>Test supplied market context</h2></div>{assessment && <span className={`status-badge${assessment.outcome === 'insufficient' ? ' is-warning' : ''}`}>{assessment.score}% matched</span>}</div><form className="inline-form strategy-form" onSubmit={evaluate}><label>Strategy<select name="strategyId" required>{strategies.map((strategy) => <option key={strategy.id} value={strategy.id}>{strategy.name}</option>)}</select></label><div className="form-row"><label>Observed category<input name="category" placeholder="e.g. session" required /></label><label>Observed condition<input name="condition" placeholder="e.g. London open" required /></label></div><button className="button" disabled={pending} type="submit">{pending ? 'Evaluating…' : 'Evaluate confluence'}</button></form>{assessment && <div className="assessment-card"><div><span>{assessment.outcome === 'qualified' ? 'QUALIFIED CONTEXT' : 'INSUFFICIENT CONTEXT'}</span><strong>{assessment.score}%</strong></div><button className="button button-small" disabled={pending} onClick={generate} type="button">{pending ? 'Saving…' : 'Save explanation'}</button></div>}<p className={`form-status${message && message.includes('Could not') ? ' is-error' : message ? ' is-success' : ''}`} role="status">{message}</p></section>{analyses.length > 0 && <section className="analysis-list"><p className="eyebrow">SAVED ANALYSES</p>{analyses.map((analysis) => <article key={analysis.id}><div><h2>{analysis.title}</h2><p>{analysis.summary}</p></div><span>{new Date(analysis.createdAt).toLocaleDateString()}</span></article>)}</section>}</>;
}
