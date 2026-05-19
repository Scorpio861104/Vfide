import { redirect } from 'next/navigation';
// T1-3: /setup is now /settings (unified Account | Vault | Security | Notifications)
export default function SetupRedirect() {
  redirect('/settings');
}
