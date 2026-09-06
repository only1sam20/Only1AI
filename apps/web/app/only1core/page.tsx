import { AppShell } from '../../components/app-shell';
import { CoreManager } from '../../components/core-manager';

export default function Only1CorePage() { return <AppShell><main className="workspace-page"><p className="eyebrow">ONLY1CORE MANAGER</p><h1>Your analysis,<br />on your terms.</h1><p className="page-lead">Only1Core learns the methodology you choose to share, then helps you review opportunity context. You always make the final decision.</p><CoreManager /></main></AppShell>; }
