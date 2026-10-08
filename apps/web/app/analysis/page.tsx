import { AppShell } from '../../components/app-shell';
import { AnalysisWorkspace } from '../../components/analysis-workspace';

export default function AnalysisPage() { return <AppShell><main className="workspace-page"><p className="eyebrow">ANALYSIS WORKSPACE</p><h1>Evidence before action.</h1><p className="page-lead">Compare the context you supply against your strategy rules. Save the comparison or request an AI explanation with its evidence and limitations shown.</p><AnalysisWorkspace /></main></AppShell>; }
