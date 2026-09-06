import Link from 'next/link';
import { Brand } from './brand';

const navigation = [
  ['Mission Control', '/mission-control'], ['Only1Core', '/only1core'], ['Strategies', '/strategies'], ['Market Scanner', '/market-scanner'], ['Analysis', '/analysis'], ['Notifications', '/notifications'], ['Marketplace', '/marketplace'],
];

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="app-layout"><aside className="sidebar"><Brand /><nav>{navigation.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</nav><div className="sidebar-bottom"><Link href="/settings">Settings</Link><Link href="/profile">Profile</Link><p>Only1AI never executes trades.</p></div></aside><div className="app-content"><header className="app-topbar"><span className="live-dot">SYSTEM READY</span><Link className="account-link" href="/profile">Your workspace <span>↗</span></Link></header>{children}</div></div>;
}
