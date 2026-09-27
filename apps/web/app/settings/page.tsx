import Link from 'next/link';
import { AppShell } from '../../components/app-shell';

export default function SettingsPage() {
  return <AppShell><main className="workspace-page"><p className="eyebrow">SETTINGS</p><h1>Control your workspace.</h1><p className="page-lead">Only1AI is built around privacy, deliberate choices, and clear ownership of your methodology.</p><div className="settings-list"><article><div><h2>Workspace profile</h2><p>Update your display name, timezone, and workspace context.</p></div><Link className="button-secondary button-small" href="/profile">Manage profile</Link></article><article><div><h2>Notifications</h2><p>Review workspace updates and mark them read when you are ready.</p></div><Link className="button-secondary button-small" href="/notifications">Open inbox</Link></article><article><div><h2>Data and privacy</h2><p>Your strategies stay private unless you explicitly choose to publish a marketplace template.</p></div><span className="status-badge">Private by default</span></article></div></main></AppShell>;
}
