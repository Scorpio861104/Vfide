import { redirect } from 'next/navigation';
// NAV-2: Pass tab context so /dao-hub lands on the DAO Hub tab inside /governance
export default function DaoHubRedirect() {
  redirect('/governance?tab=dao');
}
