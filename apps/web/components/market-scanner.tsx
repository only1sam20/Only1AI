'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { api, MarketCandles, MarketCapabilities, MarketMonitor, Only1Core, Strategy } from '../lib/api';
import { MarketChart } from './market-chart';
import styles from './phase-three.module.css';

function timeframeLabel(timeframe: string) {
  return timeframe.replace('min', ' min').replace('day', ' day').replace('week', ' week').replace('month', ' month').replace(/(\d)h$/, '$1 hour');
}

function formatTimestamp(timestamp: string, dateOnly = false) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Unavailable';
  if (dateOnly) return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
  return `${date.toLocaleString()} (your local time)`;
}

export function MarketScanner() {
  const [cores, setCores] = useState<Only1Core[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [monitors, setMonitors] = useState<MarketMonitor[]>([]);
  const [capabilities, setCapabilities] = useState<MarketCapabilities | null>(null);
  const [capabilityError, setCapabilityError] = useState('');
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [selectedCoreId, setSelectedCoreId] = useState('');
  const [selectedMonitorId, setSelectedMonitorId] = useState('');
  const [candles, setCandles] = useState<MarketCandles | null>(null);
  const [candleError, setCandleError] = useState('');
  const [loadingCandles, setLoadingCandles] = useState(false);
  const [message, setMessage] = useState('');
  const [messageIsError, setMessageIsError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const candleRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([
      api<Only1Core[]>('/only1-cores'),
      api<Strategy[]>('/strategies'),
      api<MarketMonitor[]>('/market-monitors'),
      api<MarketCapabilities>('/market-monitors/capabilities'),
    ]).then(([coreResult, strategyResult, monitorResult, capabilityResult]) => {
      if (!mounted) return;
      if (coreResult.status === 'fulfilled') {
        setCores(coreResult.value);
        setSelectedCoreId(coreResult.value[0]?.id ?? '');
      }
      if (strategyResult.status === 'fulfilled') setStrategies(strategyResult.value);
      if (monitorResult.status === 'fulfilled') {
        setMonitors(monitorResult.value);
        setSelectedMonitorId(monitorResult.value[0]?.id ?? '');
      }
      if ([coreResult, strategyResult, monitorResult].some((result) => result.status === 'rejected')) {
        setMessage('Your watchlist could not be fully loaded. Sign in and refresh the page to try again.');
        setMessageIsError(true);
      }
      if (capabilityResult.status === 'fulfilled') setCapabilities(capabilityResult.value);
      else setCapabilityError('The market connection details could not be loaded.');
      setLoading(false);
    });
    return () => {
      mounted = false;
      candleRequest.current?.abort();
    };
  }, []);

  const matchingStrategies = useMemo(() => strategies.filter((strategy) => strategy.only1CoreId === selectedCoreId), [selectedCoreId, strategies]);
  const selectedMonitor = monitors.find((monitor) => monitor.id === selectedMonitorId);

  async function checkConnection() {
    setCheckingConnection(true);
    setCapabilityError('');
    try {
      setCapabilities(await api<MarketCapabilities>('/market-monitors/capabilities'));
    } catch (error) {
      setCapabilityError(error instanceof Error ? error.message : 'The market connection details could not be loaded.');
    } finally {
      setCheckingConnection(false);
    }
  }

  function chooseMonitor(id: string) {
    candleRequest.current?.abort();
    setSelectedMonitorId(id);
    setCandles(null);
    setCandleError('');
    setLoadingCandles(false);
  }

  async function loadCandles() {
    if (!selectedMonitor || !capabilities?.configured) return;
    candleRequest.current?.abort();
    const request = new AbortController();
    candleRequest.current = request;
    setLoadingCandles(true);
    setCandleError('');
    try {
      const result = await api<MarketCandles>(`/market-monitors/${selectedMonitor.id}/candles`, { signal: request.signal });
      if (!request.signal.aborted) setCandles(result);
    } catch (error) {
      if (!request.signal.aborted) setCandleError(error instanceof Error ? error.message : 'Market candles could not be loaded.');
    } finally {
      if (!request.signal.aborted) setLoadingCandles(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setPending(true);
    setMessage('');
    setMessageIsError(false);
    try {
      const monitor = await api<MarketMonitor>('/market-monitors', {
        method: 'POST',
        body: JSON.stringify({ only1CoreId: selectedCoreId, strategyId: form.get('strategyId') || undefined, symbol: form.get('symbol'), marketType: form.get('marketType'), timeframe: form.get('timeframe') }),
      });
      setMonitors((current) => [monitor, ...current]);
      chooseMonitor(monitor.id);
      formElement.reset();
      setMessage('Market added in paused mode. Select Load candles to inspect its latest available data.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not add a market monitor.');
      setMessageIsError(true);
    } finally {
      setPending(false);
    }
  }

  async function toggleMonitor(monitor: MarketMonitor) {
    setUpdatingId(monitor.id);
    setMessage('');
    setMessageIsError(false);
    try {
      const status = monitor.status === 'active' ? 'paused' : 'active';
      const updated = await api<MarketMonitor>(`/market-monitors/${monitor.id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setMonitors((current) => current.map((item) => item.id === updated.id ? updated : item));
      setMessage(status === 'active' ? 'Monitor marked active. Candle data is loaded on request; automatic scanning is not enabled yet.' : 'Monitor paused. You can still inspect its candles on request.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update this monitor.');
      setMessageIsError(true);
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) return <div className="loading-panel" aria-label="Loading market monitors"><div className="skeleton" /><div className="skeleton" /></div>;
  if (!cores.length) return <section className="manager-panel"><div className="empty-inline"><p className="eyebrow">FIRST STEP</p><h3>Create an Only1Core to build a watchlist</h3><p>Attach your markets to an analysis workspace, then inspect their price history.</p><Link className="button" href="/only1core">Create an Only1Core</Link></div>{message && <p className="form-status is-error" role="status">{message}</p>}</section>;

  const dateOnly = candles ? ['1day', '1week', '1month'].includes(candles.timeframe) : false;

  return <>
    <section className={`manager-panel ${styles.chartPanel}`}>
      <div className="manager-heading"><div><p className="eyebrow">MARKET VIEW</p><h2>Inspect your selected market</h2></div><span className="count-tag">Twelve Data</span></div>
      <p className={`${styles.providerState}${capabilities?.configured ? ` ${styles.providerReady}` : ''}`}>
        {capabilities?.configured ? 'Market data connection configured · request candles below' : capabilities ? 'Market data connection needs setup' : 'Market data connection unavailable'}
      </p>
      {!capabilities?.configured && <div className={styles.connectionNotice}>
        <p>{capabilityError || 'Your watchlist is ready to configure. The workspace administrator needs to connect Twelve Data before price history can be loaded.'}</p>
        <button className="button-secondary button-small" type="button" disabled={checkingConnection} onClick={checkConnection}>{checkingConnection ? 'Checking…' : 'Check connection again'}</button>
      </div>}
      {monitors.length > 0 ? <div className={styles.chartControls}>
        <label className={styles.controlLabel}>Market to inspect<select value={selectedMonitorId} onChange={(event) => chooseMonitor(event.target.value)}>{monitors.map((monitor) => <option key={monitor.id} value={monitor.id}>{monitor.symbol} · {timeframeLabel(monitor.timeframe)} · {monitor.status}</option>)}</select></label>
        <button className="button" type="button" disabled={!selectedMonitor || !capabilities?.configured || loadingCandles} onClick={loadCandles}>{loadingCandles ? 'Loading candles…' : candles ? 'Refresh candles' : 'Load candles'}</button>
      </div> : <div className={styles.chartEmpty}><h3>Build your first market view</h3><p>Add a symbol and timeframe below. Your watchlist will appear here for you to inspect.</p></div>}
      {candleError && <p className="form-status is-error" role="alert">{candleError}{candles ? ' The previous chart remains visible; its timestamps are shown below.' : ''}</p>}
      {loadingCandles && !candles && <div className={styles.chartEmpty} role="status" aria-live="polite"><h3>Fetching market candles</h3><p>Requesting the latest available price history for {selectedMonitor?.symbol}.</p></div>}
      {!loadingCandles && !candles && monitors.length > 0 && <div className={styles.chartEmpty}><h3>Price history on your terms</h3><p>Choose a market and select Load candles. Data is requested only when you choose to load or refresh.</p></div>}
      {candles && (candles.bars.length ? <MarketChart data={candles} /> : <div className={styles.chartEmpty}><h3>No candles returned</h3><p>Check the symbol, its exchange, and your provider&apos;s market coverage, then try again.</p></div>)}
      {candles && <dl className={styles.marketDetails}>
        <div><dt>Source</dt><dd>Twelve Data{candles.exchange ? ` · ${candles.exchange}` : ''}{candles.currency ? ` · ${candles.currency}` : ''}</dd></div>
        <div><dt>Retrieved</dt><dd>{formatTimestamp(candles.fetchedAt)} · {candles.cached ? 'cached response' : 'provider response'}</dd></div>
        <div><dt>{dateOnly ? 'Latest candle date' : 'Latest candle start'}</dt><dd>{formatTimestamp(candles.lastBarAt, dateOnly)}</dd></div>
        <div><dt>Market timezone</dt><dd>{candles.timezone}{dateOnly ? ' · dates shown as supplied by the market' : ' · chart times displayed in UTC'}</dd></div>
      </dl>}
      <p className={styles.dataNote}>Prices can be delayed by provider coverage, exchange permissions, or a closed market. The latest candle may still be forming. Refreshes may reuse a recent cached response. Automatic scanning is not enabled yet.</p>
    </section>

    <section className="manager-panel">
      <div className="manager-heading"><div><p className="eyebrow">YOUR WATCHLIST</p><h2>Monitor only what matters</h2></div><span className="count-tag">{monitors.length} markets</span></div>
      <form className="inline-form strategy-form" onSubmit={submit}>
        <div className="form-row"><label>Only1Core<select name="only1CoreId" value={selectedCoreId} onChange={(event) => setSelectedCoreId(event.target.value)} required>{cores.map((core) => <option key={core.id} value={core.id}>{core.name}</option>)}</select></label><label>Strategy <span>optional</span><select key={selectedCoreId} name="strategyId" defaultValue=""><option value="">No strategy selected</option>{matchingStrategies.map((strategy) => <option key={strategy.id} value={strategy.id}>{strategy.name}</option>)}</select></label></div>
        <div className="form-row"><label>Symbol<input name="symbol" placeholder="EUR/USD, BTC/USD or AAPL" maxLength={32} required /></label><label>Market<select name="marketType" defaultValue="forex"><option value="forex">Forex</option><option value="crypto">Crypto</option><option value="equity">Equity</option><option value="index">Index</option><option value="commodity">Commodity</option></select></label></div>
        <label>Timeframe<select name="timeframe" defaultValue="15min" disabled={!capabilities?.supportedTimeframes.length} required>{capabilities?.supportedTimeframes.map((timeframe) => <option key={timeframe} value={timeframe}>{timeframeLabel(timeframe)}</option>)}</select></label>
        <button className="button" disabled={pending || !capabilities?.supportedTimeframes.length} type="submit">{pending ? 'Adding monitor…' : 'Add paused monitor'}</button>
      </form>
      {monitors.length > 0 && <div className="core-list">{monitors.map((monitor) => <article key={monitor.id}><div><strong>{monitor.symbol}</strong><p>{monitor.marketType} · {timeframeLabel(monitor.timeframe)}</p></div><div className={`row-actions ${styles.watchlistActions}`}><span className={`status-badge${monitor.status === 'paused' ? ' is-muted' : ''}`}>{monitor.status}</span><button className="button-quiet" type="button" onClick={() => chooseMonitor(monitor.id)}>View chart</button><button className="button-quiet" disabled={updatingId === monitor.id} onClick={() => toggleMonitor(monitor)} type="button">{updatingId === monitor.id ? 'Updating…' : monitor.status === 'active' ? 'Pause' : 'Mark active'}</button></div></article>)}</div>}
      <p className={`form-status${message ? messageIsError ? ' is-error' : ' is-success' : ''}`} role="status">{message}</p>
    </section>
  </>;
}
