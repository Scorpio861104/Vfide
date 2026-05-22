/**
 * /theme-manager → redirect shim → /theme
 *
 * Pre-cleanup, /theme-manager was a separate 253-line page with overlapping
 * functionality (presets / customize / saved tabs) duplicating /theme
 * (presets / preview / advanced tabs). Per the consolidation noted in
 * components/navigation/navigationItems.ts (line 247):
 *   "T1-4: Theme merged — one entry for /theme (the canonical theme page)"
 *
 * The route is preserved as a server-side redirect so any existing back-links
 * or bookmarks still work, and `TopNav.MORE_MATCH` keeps active-state
 * highlighting consistent. Same pattern as /social → /social-hub,
 * /setup → /settings, etc.
 */
import { redirect } from 'next/navigation';

export default function ThemeManagerRedirect() {
  redirect('/theme');
}
