import { redirect } from 'next/navigation';
// NAV-2: Pass tab context so /elections lands on the Elections tab inside /governance
export default function ElectionsRedirect() {
  redirect('/governance?tab=elections');
}
