import { redirect } from 'next/navigation';
// T1-2: /council is now the "Council" tab inside /governance
export default function CouncilRedirect() {
  redirect('/governance');
}
