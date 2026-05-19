import { redirect } from 'next/navigation';
// NAV-2: Pass tab context so /social lands on the Analytics tab inside /social-hub
export default function SocialAnalyticsRedirect() {
  redirect('/social-hub?tab=analytics');
}
