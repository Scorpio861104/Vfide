import { redirect } from 'next/navigation';
import { useLocale } from '@/lib/locale/LocaleProvider';
// NAV-2: Pass tab context so /notifications lands on the Notifications tab inside /settings
export default function NotificationsRedirect() {
  const { locale } = useLocale();
  void locale;

  redirect('/settings?tab=notifications');
}
