import { redirect } from 'next/navigation';
import { DEFAULT_LOCALE } from '@/lib/i18n';
// NAV-2: Pass tab context so /setup lands on the Account tab inside /settings
export default function SetupRedirect() {
  const locale = DEFAULT_LOCALE;
  void locale;

  redirect('/settings?tab=account');
}
