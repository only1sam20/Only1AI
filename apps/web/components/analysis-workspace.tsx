'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { api, SavedAnalysis, Strategy } from '../lib/api';
import styles from './phase-three.module.css';

type Assessment = { id: string; score: number; outcome: 'qualified' | 'insufficient' };
type PendingAction = 'evaluate' | 'save' | 'ai' | null;

function AnalysisEvidence({ analysis }: { analysis: SavedAnalysis }) {
  const evidence = analysis.evidence;
  if (!evidence) return null;
  const allRules = [...(evidence.matchedRules ?? []), ...(evidence.unmatchedRules ?? [])];
  const hasDetails = allRules.length > 0 || Boolean(evidence.limitations?.length) || Boolean(evidence.ruleReferences?.length);

  return <>
    <div className={styles.provenance}>
      <strong>{evidence.provider === 'openai' ? 'OpenAI explanation' : 'Saved rule comparison'}</strong>
      {evidence.model && <span>Model: {evidence.model}</span>}
      <span>Context: manually supplied observations</span>
      {evidence.generatedAt && <time dateTime={evidence.generatedAt}>Generated {new Date(evidence.generatedAt).toLocaleString()}</time>}
    </div>
    {hasDetails && <details className={styles.evidenceDetails}>
      <summary>Review evidence{evidence.provider === 'openai' ? ' and AI limitations' : ''}</summary>
      <div>
        {Boolean(evidence.matchedRules?.length) && <><h3>Matched rules</h3><ul>{evidence.matchedRules?.map((rule) => <li key={rule.id}>{rule.category} · {rule.condition}</li>)}</ul></>}
        {Boolean(evidence.unmatchedRules?.length) && <><h3>Unmatched rules</h3><ul>{evidence.unmatchedRules?.map((rule) => <li key={rule.id}>{rule.category} · {rule.condition}</li>)}</ul></>}
        {Boolean(evidence.ruleReferences?.length) && <><h3>Rules referenced by the AI</h3><ul>{evidence.ruleReferences?.map((id) => {
          const rule = allRules.find((candidate) => candidate.id === id);
          return <li key={id}>{rule ? `${rule.category} · ${rule.condition}` : <code>{id}</code>}</li>;
        })}</ul></>}
        {Boolean(evidence.limitations?.length) && <><h3>Limitations</h3><ul>{evidence.limitations?.map((limitation, index) => <li key={`${index}-${limitation}`}>{limitation}</li>)}</ul></>}
      </div>
    </details>}
  </>;
}

export function AnalysisWorkspace() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>([]);
  const [message, setMessage] = useState('');
  const [messageIsError, setMessageIsError] = useState(false);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [pending, setPending] = useState<PendingAction>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([api<Strategy[]>('/strategies'), api<SavedAnalysis[]>('/analyses?limit=20')])
      .then(([loadedStrategies, loadedAnalyses]) => {
        if (mounted) { setStrategies(loadedStrategies); setAnalyses(loadedAnalyses); }
      })
      .catch(() => {
        if (mounted) { setMessage('Sign in and create a strategy to begin an analysis.'); setMessageIsError(true); }
      })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  async function evaluate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending('evaluate');
    setMessage('');
    setMessageIsError(false);
    setAssessment(null);
    try {
      const result = await api<Assessment>('/confluence-assessments', {
        method: 'POST',
        body: JSON.stringify({ strategyId: form.get('strategyId'), observations: [{ category: form.get('category'), condition: form.get('condition') }] }),
      });
      setAssessment(result);
      setMessage(result.outcome === 'qualified' ? 'Your supplied context meets the configured threshold. Review the evidence before making any decision.' : 'The supplied context does not meet the configured threshold.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not evaluate confluence.');
      setMessageIsError(true);
    } finally {
      setPending(null);
    }
  }

  async function generate(withAi: boolean) {
    if (!assessment) return;
    setPending(withAi ? 'ai' : 'save');
    setMessage('');
    setMessageIsError(false);
    try {
      const analysis = await api<SavedAnalysis>(`/analyses/from-assessment/${assessment.id}${withAi ? '/ai' : ''}`, { method: 'POST' });
      setAnalyses((current) => [analysis, ...current.filter((item) => item.id !== analysis.id)]);
      setMessage(withAi ? 'AI explanation saved. Review the cited rules and limitations alongside the original assessment.' : 'Rule comparison saved. No AI request was made.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not generate an explanation.');
      setMessageIsError(true);
    } finally {
      setPending(null);
    }
  }

  if (loading) return <div className="loading-panel" aria-label="Loading analysis workspace"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div>;
  if (!strategies.length) return <section className="manager-panel"><div className="empty-inline"><p className="eyebrow">FIRST STEP</p><h3>Create a strategy before reviewing confluence</h3><p>Analysis compares supplied market observations only against the rules you define.</p><Link className="button" href="/strategies">Create a strategy</Link></div>{message && <p className="form-status is-error" role="status">{message}</p>}</section>;

  return <>
    <section className="manager-panel">
      <div className="manager-heading"><div><p className="eyebrow">CONFLUENCE REVIEW</p><h2>Test supplied market context</h2></div>{assessment && <span className={`status-badge${assessment.outcome === 'insufficient' ? ' is-warning' : ''}`}>{assessment.score}% matched</span>}</div>
      <form className="inline-form strategy-form" onSubmit={evaluate} onChange={() => setAssessment(null)}>
        <label>Strategy<select name="strategyId" required disabled={pending !== null}>{strategies.map((strategy) => <option key={strategy.id} value={strategy.id}>{strategy.name}</option>)}</select></label>
        <div className="form-row"><label>Observed category<input name="category" placeholder="e.g. session" required maxLength={48} disabled={pending !== null} /></label><label>Observed condition<input name="condition" placeholder="e.g. London open" required maxLength={120} disabled={pending !== null} /></label></div>
        <button className="button" disabled={pending !== null} type="submit">{pending === 'evaluate' ? 'Evaluating…' : 'Evaluate confluence'}</button>
      </form>
      {assessment && <>
        <div className="assessment-card"><div><span>{assessment.outcome === 'qualified' ? 'QUALIFIED CONTEXT' : 'INSUFFICIENT CONTEXT'}</span><strong>{assessment.score}%</strong></div><div className={styles.analysisActions}><button className="button-secondary button-small" disabled={pending !== null} onClick={() => generate(false)} type="button">{pending === 'save' ? 'Saving…' : 'Save explanation'}</button><button className="button button-small" disabled={pending !== null} onClick={() => generate(true)} type="button">{pending === 'ai' ? 'Explaining with AI…' : 'Explain with AI'}</button></div></div>
        <p className={styles.dataNote}>Save explanation records the rule comparison. Explain with AI asks OpenAI to explain that assessment and saves its response; provider usage charges may apply. AI uses your entered observations and rule matches, and does not read your chart automatically or change the confluence score.</p>
      </>}
      <p className={`form-status${message ? messageIsError ? ' is-error' : ' is-success' : ''}`} role="status">{message}</p>
    </section>
    {analyses.length > 0 && <section className="analysis-list"><p className="eyebrow">SAVED ANALYSES</p>{analyses.map((analysis) => <article key={analysis.id}><div className={styles.analysisBody}><h2>{analysis.title}</h2><p className={styles.analysisText}>{analysis.summary}</p><AnalysisEvidence analysis={analysis} /></div><span>{new Date(analysis.createdAt).toLocaleDateString()}</span></article>)}</section>}
  </>;
}
