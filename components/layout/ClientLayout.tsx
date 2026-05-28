'use client';

import { ReactNode, Suspense, useEffect } from 'react';
import { LazyMotion, domAnimation } from 'framer-motion';
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
import { MonumentOverrideProvider, useMonumentOverride } from './MonumentOverrideContext';

// Routes where the fixed monument should be hidden — they manage their own variants.
const MONUMENT_BLACKLIST = new Set(['/']);

const TIER_HEX: Record<string, string> = {
  Risky:      '#FF4444',
  'Low Trust':'#FFA500',
  Neutral:    '#17E8F0',
  Governance: '#60A5FA',
  Trusted:    '#34D399',
  Council:    '#A78BFA',
  Elite:      '#00FF88',
};

function scoreToTierName(score: number): string {
  if (score >= 8000) return 'Elite';
  if (score >= 7000) return 'Council';
  if (score >= 5600) return 'Trusted';
  if (score >= 5400) return 'Governance';
  if (score >= 5000) return 'Neutral';
  if (score >= 3500) return 'Low Trust';
  return 'Risky';
}

/**
 * GlobalMonument — viewport-fixed MonumentBackdrop wired to:
 *   1. Any active MonumentOverride (e.g. the ProofScore simulator slider)
 *   2. The connected wallet's live on-chain ProofScore
 *   3. Autonomous sine pulse when neither is available
 */
function GlobalMonument({ pathname }: { pathname: string }) {
  const { score: chainScore } = useProofScore();
  const { override } = useMonumentOverride();

  if (MONUMENT_BLACKLIST.has(pathname)) return null;

  // Override wins — simulator slider drives it directly
  const effectiveScore = override !== null ? override.score : chainScore;

  const intensity =
    effectiveScore === null
      ? undefined  // triggers autonomous pulse in MonumentBackdrop
      : Math.max(0.1, Math.min(0.9, effectiveScore / 10000));

  const vertexHex =
    effectiveScore === null
      ? '#17E8F0'
      : TIER_HEX[scoreToTierName(effectiveScore)] ?? '#17E8F0';

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
    const label =
      pathname === '/'
        ? 'Home page loaded'
        : `${pathname.replace(/^\//, '').replace(/[/-]+/g, ' ').trim() || 'Page'} loaded`;
    region.textContent = label;
    const timeout = window.setTimeout(() => {
      if (region.textContent === label) region.textContent = '';
    }, 900);
    return () => window.clearTimeout(timeout);
  }, [pathname]);
}

export function ClientLayout({ children }: ClientLayoutProps) {
  const { address } = useAccount();
  const pathname = usePathname();

  useEffect(() => { registerServiceWorker(); }, []);
  useRouteAnnouncement(pathname);

  return (
    <LazyMotion features={domAnimation} strict>
    <RealtimeProvider wsUrl={process.env.NEXT_PUBLIC_WEBSOCKET_URL}>
      <UserProvider address={address}>
        <LiveProofScoreProvider>
          <WizardStateProvider>
            <MonumentOverrideProvider>
              <GlobalMonument pathname={pathname} />
              <AppShell>{children}</AppShell>
              <Suspense fallback={null}><WizardMount /></Suspense>
            </MonumentOverrideProvider>
          </WizardStateProvider>
        </LiveProofScoreProvider>
      </UserProvider>
    </RealtimeProvider>
    </LazyMotion>
  );
}
