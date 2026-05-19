import { redirect } from 'next/navigation';
// R90-1: /disputes is now the "Disputes" tab inside /governance
// The standalone page remains as a redirect to avoid dual-path duplication
export default function DisputesRedirect() {
  redirect('/governance?tab=disputes');
}
