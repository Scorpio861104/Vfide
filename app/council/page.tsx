import { redirect } from 'next/navigation';
// NAV-2: Pass tab context so /council lands on the Council tab inside /governance
export default function CouncilRedirect() {
  redirect('/governance?tab=council');
}
