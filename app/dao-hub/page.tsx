import { redirect } from 'next/navigation';
import { useLocale } from '@/lib/locale/LocaleProvider';
// NAV-2: Pass tab context so /dao-hub lands on the DAO Hub tab inside /governance
export default function DaoHubRedirect() {
  const { locale } = useLocale();
  void locale;

  redirect('/governance?tab=dao');
}
