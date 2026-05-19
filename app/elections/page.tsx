import { redirect } from 'next/navigation';
// T1-2: /elections is now the "Elections" tab inside /governance
export default function ElectionsRedirect() {
  redirect('/governance');
}
