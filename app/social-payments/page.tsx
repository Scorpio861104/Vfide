import { redirect } from 'next/navigation';

// T1-1: /social-payments now lives as the "Pay Friends" tab inside /social-hub.
export default function SocialPaymentsRedirect() {
  redirect('/social-hub');
}
