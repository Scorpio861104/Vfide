import { redirect } from 'next/navigation';
import { useLocale } from '@/lib/locale/LocaleProvider';
// NAV-2: Pass tab context so /elections lands on the Elections tab inside /governance
export default function ElectionsRedirect() {
  const { locale } = useLocale();
  void locale;

  redirect('/governance?tab=elections');
}
