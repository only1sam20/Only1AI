import { AppShell } from '../../components/app-shell';
import { ProfileManager } from '../../components/profile-manager';

export default function ProfilePage() {
  return <AppShell><main className="workspace-page"><p className="eyebrow">YOUR PROFILE</p><h1>Make the workspace yours.</h1><p className="page-lead">Your display name, timezone, and workspace note help keep the experience personal while your analysis rules remain private.</p><ProfileManager /></main></AppShell>;
}
