import { redirect } from 'next/navigation';
// R90-1: /treasury is now the "Treasury" sub-tab inside the DAO Hub tab of /governance
// The standalone page remains as a redirect to avoid dual-path duplication
export default function TreasuryRedirect() {
  redirect('/governance?tab=dao&dao=treasury');
}
