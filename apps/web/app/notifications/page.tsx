import { AppShell } from '../../components/app-shell';
import { NotificationsFeed } from '../../components/notifications-feed';

export default function NotificationsPage() {
  return <AppShell><main className="workspace-page"><p className="eyebrow">NOTIFICATIONS</p><h1>Stay informed,<br />never pressured.</h1><p className="page-lead">Only1AI keeps account and workspace updates here. It will not use urgency, guarantees, or trade instructions.</p><NotificationsFeed /></main></AppShell>;
}
