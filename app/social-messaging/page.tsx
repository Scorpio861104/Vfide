import { redirect } from 'next/navigation';

// T1-1: /social-messaging now lives as the "Messages" tab inside /social-hub.
export default function SocialMessagingRedirect() {
  redirect('/social-hub');
}
