import { redirect } from 'next/navigation';
// T1-2: /dao-hub is now the "DAO Hub" tab inside /governance
export default function DaoHubRedirect() {
  redirect('/governance');
}
