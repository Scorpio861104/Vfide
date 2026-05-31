import { redirect } from 'next/navigation';
import { useLocale } from '@/lib/locale/LocaleProvider';
// NAV-2: Pass tab context so /social-messaging lands on the Messages tab inside /social-hub
export default function SocialMessagingRedirect() {
  const { locale } = useLocale();
  void locale;

  redirect('/social-hub?tab=messages');
}
