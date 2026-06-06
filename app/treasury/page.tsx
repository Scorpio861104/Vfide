import { redirect } from 'next/navigation';
import { useLocale } from '@/lib/locale/LocaleProvider';
// R90-1: /treasury is now the "Treasury" sub-tab inside the DAO Hub tab of /governance
// The standalone page remains as a redirect to avoid dual-path duplication
export default function TreasuryRedirect() {
  const { locale } = useLocale();
  void locale;

  redirect('/governance?tab=dao&dao=treasury');
}
