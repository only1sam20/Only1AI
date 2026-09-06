import { AppShell } from '../../components/app-shell';
import { AnalysisWorkspace } from '../../components/analysis-workspace';

export default function AnalysisPage() { return <AppShell><main className="workspace-page"><p className="eyebrow">ANALYSIS WORKSPACE</p><h1>Evidence before action.</h1><p className="page-lead">Compare supplied context against your rules, then generate a saved explanation of matched and unmet confluences. Nothing here is a trade instruction.</p><AnalysisWorkspace /></main></AppShell>; }
