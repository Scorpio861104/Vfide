import { redirect } from 'next/navigation';
// Absorbed into /developer hub — this route is preserved as a redirect for bookmarks and nav links.
export default function TokenLaunchRedirect() { redirect('/developer?tab=token-launch'); }
