import { AppShell } from '../../components/app-shell';
import { MarketScanner } from '../../components/market-scanner';

export default function MarketScannerPage() { return <AppShell><main className="workspace-page"><p className="eyebrow">MARKET SCANNER</p><h1>Select markets.<br />Keep control.</h1><p className="page-lead">Build your watchlist and inspect real price history on a TradingView chart. Load candles when you need them, with source and freshness clearly shown.</p><MarketScanner /></main></AppShell>; }
