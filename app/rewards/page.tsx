import { redirect } from 'next/navigation';
// Consolidated into /rewards-hub — redirect preserved for bookmarks and nav deep-links.
export default function RewardsRedirect() {
  redirect('/rewards-hub?tab=about');
}
