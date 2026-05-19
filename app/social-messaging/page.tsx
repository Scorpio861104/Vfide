import { redirect } from 'next/navigation';
// NAV-2: Pass tab context so /social-messaging lands on the Messages tab inside /social-hub
export default function SocialMessagingRedirect() {
  redirect('/social-hub?tab=messages');
}
