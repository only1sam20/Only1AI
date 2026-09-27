import { AppShell } from '../../components/app-shell';
import { MarketplaceBrowser } from '../../components/marketplace-browser';

export default function MarketplacePage() {
  return <AppShell><main className="workspace-page"><p className="eyebrow">MARKETPLACE</p><h1>Learn from frameworks.<br />Keep your own judgement.</h1><p className="page-lead">Browse curated strategy templates from creators. Every template is a starting point for your process, not a promise of performance.</p><MarketplaceBrowser /></main></AppShell>;
}
