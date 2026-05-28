import { redirect } from 'next/navigation';
// Verifier tool is now a tab inside /security-center — redirect preserved for bookmarks.
export default function VerifierRedirect() {
  redirect('/security-center?tab=verifier');
}
