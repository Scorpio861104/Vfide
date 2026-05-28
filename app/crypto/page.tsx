import { redirect } from 'next/navigation';
// Absorbed into /wallet hub — this route is preserved as a redirect for bookmarks and nav links.
export default function CryptoRedirect() { redirect('/wallet?tab=activity'); }
