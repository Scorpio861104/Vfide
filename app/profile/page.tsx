import { redirect } from 'next/navigation';
// Profile and account settings live in /me — redirect for bookmarks and nav links.
export default function ProfileRedirect() { redirect('/me'); }
