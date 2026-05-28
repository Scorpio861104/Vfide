import { redirect } from 'next/navigation';
// Absorbed into /wallet — this route is preserved as a redirect for bookmarks and nav links.
export default function StealthRedirect() { redirect('/wallet?tab=private'); }
