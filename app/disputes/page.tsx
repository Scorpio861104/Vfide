import { redirect } from 'next/navigation';
import { useLocale } from '@/lib/locale/LocaleProvider';
// R90-1: /disputes is now the "Disputes" tab inside /governance
// The standalone page remains as a redirect to avoid dual-path duplication
export default function DisputesRedirect() {
  const { locale } = useLocale();
  void locale;

  redirect('/governance?tab=disputes');
}
