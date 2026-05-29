import { redirect } from 'next/navigation';
import { useT } from '@/lib/i18n';
// Profile and account settings live in /me — redirect for bookmarks and nav links.
export default function ProfileRedirect() {
  const t = useT(); redirect('/me'); }
