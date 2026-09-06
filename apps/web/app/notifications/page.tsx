import { AppShell } from '../../components/app-shell';

export default function NotificationsPage() {
  return <AppShell><main className="workspace-page"><p className="eyebrow">NOTIFICATIONS</p><h1>Your inbox is clear.</h1><p className="page-lead">Only1AI will keep your workspace updates here. Notification delivery is configured around your preferences—never around urgency or pressure.</p><section className="empty-panel"><span className="empty-icon">◎</span><h2>No new notifications</h2><p>Updates about your analyses, watched markets, and account will appear here.</p></section></main></AppShell>;
}
