import { redirect } from 'next/navigation';
// Consolidated into /roadmap — this route preserved as a redirect for bookmarks and nav links.
export default function MultisigRedirect() {
  redirect('/roadmap#multisig');
}
