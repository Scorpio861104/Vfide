'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { ProtocolTicker } from './ProtocolTicker';
import { MonumentCorner } from './MonumentCorner';
import { TopNav } from './TopNav';
import { BottomTabBar } from './BottomTabBar';
import { RecoveryBeacon } from '@/components/security/RecoveryBeacon';
import { OwnerChallengeBanner } from '@/components/security/OwnerChallengeBanner';
import { TierAurora } from '@/components/identity/TierAurora';
import { TimeLattice } from '@/components/identity/TimeLattice';
import { TransactionTrailLayer } from '@/components/payments/TransactionTrailLayer';
import { Footer } from '@/components/layout/Footer';

// The shared chrome (top nav, bottom tab bar on mobile, ticker, monument
// corner) shows on every page except truly chrome-free surfaces —
// embedded checkout widgets and short-link redirector pages.
//
// History:
//   - TopNav and BottomTabBar existed but weren't being mounted; pages
//     carried pt-20/pt-24 paying tribute to a top nav that didn't paint.
//     Restored in an earlier round.
//   - PieMenu was a 945-line floating radial menu acting as the desktop
//     "everything else" surface. Replaced by the More tab pattern: 4
//     primary tabs + a "More" button that opens MoreSheet. Same job,
//     same data source (navigationItems.ts), conventional bottom-sheet/
//     popover interaction instead of a custom radial widget. PieMenu's
//     file is preserved for now in case we want to bring it back as an
//     optional power-user accelerator, but it's no longer mounted —
//     the More button is the single canonical entry point.
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
      <TierAurora />
      <OwnerChallengeBanner />
      <TopNav />
      <ProtocolTicker />
      <TimeLattice />
      <main id="main" role="main" className="pt-7 pb-20 md:pb-0 appshell-content" tabIndex={-1}>
        {children}
        <Footer />
      </main>
      <BottomTabBar />
      <MonumentCorner />
      <RecoveryBeacon />
      <TransactionTrailLayer />
    </>
  );
}
