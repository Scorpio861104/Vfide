/**
 * /theme-showcase → redirect shim → /theme
 *
 * Pre-cleanup, /theme-showcase was a 265-line designer-facing page demoing
 * VFIDE's signature visual elements. Its content is now served by the
 * Preview tab inside /theme (the canonical theme page), per the
 * consolidation noted in components/navigation/navigationItems.ts:
 *   "T1-4: Theme merged — one entry for /theme (the canonical theme page)"
 *
 * The route is preserved as a server-side redirect so any existing back-links
 * or bookmarks still work, and `TopNav.MORE_MATCH` keeps active-state
 * highlighting consistent. Same pattern as /social → /social-hub,
 * /setup → /settings, etc.
 */
import { redirect } from 'next/navigation';

export default function ThemeShowcaseRedirect() {
  redirect('/theme?tab=preview');
}
