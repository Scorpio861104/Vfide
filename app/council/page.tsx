import { redirect } from 'next/navigation';
import { useLocale } from '@/lib/locale/LocaleProvider';
// NAV-2: Pass tab context so /council lands on the Council tab inside /governance
export default function CouncilRedirect() {
  const { locale } = useLocale();
  void locale;

  redirect('/governance?tab=council');
}
