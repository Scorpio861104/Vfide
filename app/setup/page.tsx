import { redirect } from 'next/navigation';
// NAV-2: Pass tab context so /setup lands on the Account tab inside /settings
export default function SetupRedirect() {
  redirect('/settings?tab=account');
}
