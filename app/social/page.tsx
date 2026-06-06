import { redirect } from 'next/navigation';
import { useLocale } from '@/lib/locale/LocaleProvider';
// NAV-2: Pass tab context so /social lands on the Analytics tab inside /social-hub
export default function SocialAnalyticsRedirect() {
  const { locale } = useLocale();
  void locale;

  redirect('/social-hub?tab=analytics');
}
