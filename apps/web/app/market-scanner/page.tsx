import { AppShell } from '../../components/app-shell';
import { MarketScanner } from '../../components/market-scanner';

export default function MarketScannerPage() { return <AppShell><main className="workspace-page"><p className="eyebrow">MARKET SCANNER</p><h1>Select markets.<br />Keep control.</h1><p className="page-lead">Add the instruments and timeframes your Only1Core should monitor. Monitoring highlights context; it never executes a trade.</p><MarketScanner /></main></AppShell>; }
