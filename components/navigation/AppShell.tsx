'use client';

import { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { ProtocolTicker } from './ProtocolTicker';
import { TopNav } from './TopNav';
import { BottomTabBar } from './BottomTabBar';

const MonumentCorner = dynamic(() => import('./MonumentCorner').then((mod) => mod.MonumentCorner), { ssr: false });
const RecoveryBeacon = dynamic(() => import('@/components/security/RecoveryBeacon').then((mod) => mod.RecoveryBeacon), { ssr: false });
const OwnerChallengeBanner = dynamic(() => import('@/components/security/OwnerChallengeBanner').then((mod) => mod.OwnerChallengeBanner), { ssr: false });
const TierAurora = dynamic(() => import('@/components/identity/TierAurora').then((mod) => mod.TierAurora), { ssr: false });
const TimeLattice = dynamic(() => import('@/components/identity/TimeLattice').then((mod) => mod.TimeLattice), { ssr: false });
const TransactionTrailLayer = dynamic(() => import('@/components/payments/TransactionTrailLayer').then((mod) => mod.TransactionTrailLayer), { ssr: false });

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
  walletEnabled?: boolean;
  isConnected?: boolean;
}

export function AppShell({ children, walletEnabled = true, isConnected = false }: AppShellProps) {
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
      {walletEnabled && <OwnerChallengeBanner />}
      <TopNav walletEnabled={walletEnabled} isConnected={isConnected} />
      <ProtocolTicker />
      {walletEnabled && <TimeLattice />}
      <main id="main" role="main" className="pt-7 pb-20 md:pb-0 appshell-content" tabIndex={-1}>
        {children}
      </main>
      <BottomTabBar />
      <MonumentCorner />
      {walletEnabled && <RecoveryBeacon />}
      <TransactionTrailLayer />
    </>
  );
}
