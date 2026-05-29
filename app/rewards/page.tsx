import { redirect } from 'next/navigation';
import { useT } from '@/lib/i18n';
// Consolidated into /rewards-hub — redirect preserved for bookmarks and nav deep-links.
export default function RewardsRedirect() {
  const t = useT();
  redirect('/rewards-hub?tab=about');
}
