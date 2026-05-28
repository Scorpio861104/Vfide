import { redirect } from 'next/navigation';
// Consolidated into /roadmap — preserved as redirect for bookmarks and nav links.
export default function TimeLocksRedirect() {
  redirect('/roadmap#time-locks');
}
