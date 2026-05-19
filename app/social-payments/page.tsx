import { redirect } from 'next/navigation';
// NAV-2: Pass tab context so /social-payments lands on the Pay Friends tab inside /social-hub
export default function SocialPaymentsRedirect() {
  redirect('/social-hub?tab=pay');
}
