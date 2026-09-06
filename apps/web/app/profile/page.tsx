import { AppShell } from '../../components/app-shell';

export default function ProfilePage() {
  return <AppShell><main className="workspace-page"><p className="eyebrow">YOUR PROFILE</p><h1>Make the workspace yours.</h1><section className="profile-card"><div className="avatar">01</div><div><h2>Complete your profile</h2><p>Your display name and timezone help personalise your Only1AI workspace.</p></div><a className="button button-small" href="/settings">Edit profile</a></section></main></AppShell>;
}
