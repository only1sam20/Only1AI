'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Brand } from './brand';

type NavigationItem = { label: string; href: string; icon: string };

const primaryNavigation: NavigationItem[] = [
  { label: 'Mission Control', href: '/mission-control', icon: 'grid' },
  { label: 'Only1Cores', href: '/only1core', icon: 'layers' },
  { label: 'Strategies', href: '/strategies', icon: 'route' },
  { label: 'Market Scanner', href: '/market-scanner', icon: 'scan' },
  { label: 'Analysis', href: '/analysis', icon: 'spark' },
  { label: 'Notifications', href: '/notifications', icon: 'bell' },
  { label: 'Marketplace', href: '/marketplace', icon: 'store' },
];

const secondaryNavigation: NavigationItem[] = [
  { label: 'Profile', href: '/profile', icon: 'user' },
  { label: 'Settings', href: '/settings', icon: 'settings' },
];

function NavIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5" /><path d="m3 16 9 5 9-5" /></>,
    route: <><circle cx="6" cy="18" r="2" /><circle cx="18" cy="6" r="2" /><path d="M8 18h2a4 4 0 0 0 4-4v-4a4 4 0 0 1 4-4" /></>,
    scan: <><path d="M4 8V5a1 1 0 0 1 1-1h3" /><path d="M16 4h3a1 1 0 0 1 1 1v3" /><path d="M20 16v3a1 1 0 0 1-1 1h-3" /><path d="M8 20H5a1 1 0 0 1-1-1v-3" /><path d="m9 15 2-2 2 1 3-4" /></>,
    spark: <path d="m12 3-1.6 5.4L5 10l5.4 1.6L12 17l1.6-5.4L19 10l-5.4-1.6L12 3Z" />,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    store: <><path d="M4 10v10h16V10" /><path d="M3 5h18l-1 5H4L3 5Z" /><path d="M9 20v-6h6v6" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.1 2.1-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2h-3v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-2.1-2.1.1-.1A1.7 1.7 0 0 0 7 15a1.7 1.7 0 0 0-1.5-1H5.3v-3h.2A1.7 1.7 0 0 0 7 10a1.7 1.7 0 0 0-.3-1.9l-.1-.1 2.1-2.1.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5v-.2h3v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 2.1 2.1-.1.1A1.7 1.7 0 0 0 19.4 10a1.7 1.7 0 0 0 1.5 1h.2v3h-.2a1.7 1.7 0 0 0-1.5 1Z" /></>,
  };
  return <svg aria-hidden="true" className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function NavigationLinks({ items, onNavigate }: { items: NavigationItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return <>{items.map((item) => {
    const active = pathname === item.href;
    return <Link key={item.href} href={item.href} className={`nav-link${active ? ' is-active' : ''}`} aria-current={active ? 'page' : undefined} onClick={onNavigate}><NavIcon name={item.icon} /><span>{item.label}</span></Link>;
  })}</>;
}

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  return <div className="app-layout">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <aside className="sidebar" aria-label="Workspace navigation">
      <div className="sidebar-brand"><Brand /><span className="beta-badge">BETA</span></div>
      <nav className="sidebar-nav" aria-label="Primary navigation"><NavigationLinks items={primaryNavigation} /></nav>
      <div className="sidebar-footer">
        <nav aria-label="Account navigation"><NavigationLinks items={secondaryNavigation} /></nav>
        <p>Analysis support only. You remain responsible for every decision.</p>
      </div>
    </aside>
    <div className="app-content">
      <header className="app-topbar">
        <button className="menu-button" type="button" aria-label={mobileMenuOpen ? 'Close navigation' : 'Open navigation'} aria-controls="mobile-navigation" aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen((open) => !open)}><span /><span /><span /></button>
        <div className="mobile-brand"><Brand /></div>
        <div className="system-status"><span className="status-dot" />Workspace ready</div>
        <Link className="account-link" href="/profile"><span className="account-avatar">01</span><span>My profile</span></Link>
      </header>
      {mobileMenuOpen && <div className="mobile-navigation" id="mobile-navigation" role="dialog" aria-label="Navigation menu"><nav><NavigationLinks items={[...primaryNavigation, ...secondaryNavigation]} onNavigate={closeMobileMenu} /></nav></div>}
      <div id="main-content" tabIndex={-1}>{children}</div>
    </div>
  </div>;
}
