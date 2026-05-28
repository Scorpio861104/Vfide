'use client';

import { ReactNode, Suspense, useEffect } from 'react';
import { registerServiceWorker } from '@/lib/sw-register';
import { usePathname } from 'next/navigation';
import { useAccount } from 'wagmi';
import { AppShell } from '@/components/navigation';
import { LiveProofScoreProvider } from '@/components/navigation/LiveProofScoreProvider';
import { RealtimeProvider, UserProvider } from '@/lib/data';
import { WizardMount } from '@/components/wizard/WizardMount';
import { WizardStateProvider } from '@/components/wizard/useWizardState';
import { MonumentBackdrop } from '@/app/components/MonumentBackdrop';
import { useProofScore } from '@/hooks/useProofScore';
import { PROOF_SCORE_TIERS } from '@/lib/constants';

// Routes where the fixed monument should be hidden (it would clash with their
// own MonumentBackdrop or be visually distracting on narrow-focus pages).
const MONUMENT_BLACKLIST = new Set([
  '/',        // landing page renders its own hero/full variants already
]);

/**
 * GlobalMonument — renders the fixed viewport-locked MonumentBackdrop.
 * Intensity is wired to the connected user's ProofScore so the vertex
 * glow brightens as reputation grows. Fades to near-invisible on scroll
 * so it never competes with body content.
 */
function GlobalMonument({ pathname }: { pathname: string }) {
  const { score } = useProofScore();

  // Hide on blacklisted routes (they manage their own monument)
  if (MONUMENT_BLACKLIST.has(pathname)) return null;

  // Map score (0–10000) to intensity (0.1..0.9).
  // Min 0.1 so disconnected visitors still see a faint mark.
  const intensity = score === null
    ? undefined  // autonomous pulse for disconnected visitors
    : Math.max(0.1, Math.min(0.9, score / 10000));

  // Derive vertex hex from tier colour so it shifts cyan→violet→green
  // as the user climbs tiers.
  const TIER_HEX: Record<string, string> = {
    Risky:      '#FF4444',
    'Low Trust':'#FFA500',
    Neutral:    '#17E8F0',
    Governance: '#60A5FA',
    Trusted:    '#34D399',
    Council:    '#A78BFA',
    Elite:      '#00FF88',
  };
  const tierName =
    score === null ? 'Neutral'
    : score >= 8000 ? 'Elite'
    : score >= 7000 ? 'Council'
    : score >= 5600 ? 'Trusted'
    : score >= 5400 ? 'Governance'
    : score >= 5000 ? 'Neutral'
    : score >= 3500 ? 'Low Trust'
    : 'Risky';

  const vertexHex = TIER_HEX[tierName] ?? '#17E8F0';

  return (
    <MonumentBackdrop
      variant="fixed"
      intensity={intensity}
      vertexHex={vertexHex}
      scrollFade
    />
  );
}

interface ClientLayoutProps {
  children: ReactNode;
}

function useRouteAnnouncement(pathname: string) {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const region = document.getElementById('global-live-region');
    if (!region) return;

    const label = pathname === '/'
      ? 'Home page loaded'
      : `${pathname.replace(/^\//, '').replace(/[/-]+/g, ' ').trim() || 'Page'} loaded`;

    region.textContent = label;
    const timeout = window.setTimeout(() => {
      if (region.textContent === label) {
        region.textContent = '';
      }
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [pathname]);
}

export function ClientLayout({ children }: ClientLayoutProps) {
  const { address } = useAccount();
  const pathname = usePathname();

  useEffect(() => {
    registerServiceWorker();
  }, []);

  useRouteAnnouncement(pathname);

  return (
    <RealtimeProvider wsUrl={process.env.NEXT_PUBLIC_WEBSOCKET_URL}>
      <UserProvider address={address}>
        <LiveProofScoreProvider>
          <WizardStateProvider>
            {/* Global fixed monument — follows the user through every page */}
            <GlobalMonument pathname={pathname} />
            <AppShell>{children}</AppShell>
            <Suspense fallback={null}><WizardMount /></Suspense>
          </WizardStateProvider>
        </LiveProofScoreProvider>
      </UserProvider>
    </RealtimeProvider>
  );
}
