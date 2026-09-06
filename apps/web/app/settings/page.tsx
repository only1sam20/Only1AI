import { AppShell } from '../../components/app-shell';

export default function SettingsPage() {
  return <AppShell><main className="workspace-page"><p className="eyebrow">SETTINGS</p><h1>Control your workspace.</h1><div className="settings-list"><article><div><h2>Account security</h2><p>Manage sign-in and active sessions.</p></div><span>Coming soon</span></article><article><div><h2>Notification preferences</h2><p>Choose how workspace updates are delivered.</p></div><span>Coming soon</span></article><article><div><h2>Data & privacy</h2><p>Your strategies stay private unless you explicitly publish a template.</p></div><span>Protected</span></article></div></main></AppShell>;
}
