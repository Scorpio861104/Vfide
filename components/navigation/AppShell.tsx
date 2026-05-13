'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { PieMenu } from './PieMenu';
import { ProtocolTicker } from './ProtocolTicker';
import { MonumentCorner } from './MonumentCorner';
import { TopNav } from './TopNav';
import { BottomTabBar } from './BottomTabBar';

// The shared chrome (top nav, bottom tab bar on mobile, pie menu,
// ticker, monument corner) shows on every page except truly chrome-free
// surfaces — embedded checkout widgets and short-link redirector pages.
//
// History: TopNav and BottomTabBar existed but weren't being mounted —
// the shell was rendering only the ticker, pie menu, and monument
// corner. Pages still carried `pt-20`/`pt-24` paying tribute to a top
// nav that no longer painted, so the visible result was a band of empty
// space at the top of every page. Restoring the mount here puts the
// site nav back where every page expects it.
const EXCLUDED_PATHS = [
  '/embed',
  '/s/',
];

function shouldShowChrome(pathname: string): boolean {
  return !EXCLUDED_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const showChrome = shouldShowChrome(pathname);

  if (!showChrome) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Top nav (desktop) is fixed at top-0 with h-14. The ProtocolTicker
          sits at top-14 with h-7 on desktop, top-0 with h-7 on mobile
          (where there's no TopNav). Together they form an 84px fixed
          chrome strip on desktop, 28px on mobile.

          The wrapper's pt-7 compensates for the ticker so existing
          page-level pt-20/pt-24 values land below both. The pb-20 (md:pb-0)
          gives mobile users clearance below the 64px BottomTabBar so
          footers and page-bottom content aren't hidden under it. */}
      <TopNav />
      <ProtocolTicker />
      <div className="pt-7 pb-20 md:pb-0">{children}</div>
      <BottomTabBar />
      <PieMenu />
      <MonumentCorner />
    </>
  );
}
