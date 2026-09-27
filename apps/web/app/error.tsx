'use client';

export default function GlobalError({ reset }: Readonly<{ reset: () => void }>) {
  return <main className="auth-page"><section className="auth-card"><p className="eyebrow">WORKSPACE NOTICE</p><h1>Something needs another try.</h1><p className="auth-copy">Your saved work has not been changed. Check your connection, then retry the page.</p><button className="button" onClick={reset} type="button">Try again</button><a className="text-link" href="/mission-control">Return to Mission Control</a></section></main>;
}
