import { redirect } from 'next/navigation';
import { useLocale } from '@/lib/locale/LocaleProvider';
// NAV-2: Pass tab context so /social-payments lands on the Pay Friends tab inside /social-hub
export default function SocialPaymentsRedirect() {
  const { locale } = useLocale();
  void locale;

  redirect('/social-hub?tab=pay');
}
