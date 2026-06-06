'use client';

import { ReactNode, Suspense, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { LazyMotion, domAnimation } from 'framer-motion';
import { registerServiceWorker } from '@/lib/sw-register';
import { usePathname } from 'next/navigation';
import { useAccount } from 'wagmi';
import { AppShell } from '@/components/navigation/AppShell';
import { LiveProofScoreProvider } from '@/components/navigation/LiveProofScoreProvider';
import { RealtimeProvider, UserProvider } from '@/lib/data';
import { WizardStateProvider } from '@/components/wizard/useWizardState';
import { MonumentOverrideProvider, useMonumentOverride } from './MonumentOverrideContext';

const WizardMount = dynamic(() => import('@/components/wizard/WizardMount').then((mod) => mod.WizardMount), { ssr: false });
const MonumentBackdrop = dynamic(() => import('@/app/components/MonumentBackdrop').then((mod) => mod.MonumentBackdrop), { ssr: false });

// Routes where the fixed monument should be hidden — they manage their own variants.
const MONUMENT_BLACKLIST = new Set(['/']);

function scoreToMonumentVertexHex(score: number): string {
  if (score >= 8000) return '#00FF88';
  if (score >= 6500) return '#00F0FF';
  if (score >= 5000) return '#FFD700';
  if (score >= 3500) return '#FFA500';
  return '#FF4444';
}

/**
 * GlobalMonument — viewport-fixed MonumentBackdrop wired to any active
 * MonumentOverride (for simulator-driven pages) and otherwise allowed to use
 * its own autonomous pulse. Keep this lightweight: do not import contract
 * hooks here, because ClientLayout is in every route's first compile path.
 */
function GlobalMonument({ pathname }: { pathname: string }) {
  const { override } = useMonumentOverride();

  if (MONUMENT_BLACKLIST.has(pathname)) return null;

  const intensity = override !== null
    ? Math.max(0.1, Math.min(0.9, override.score / 10000))
    : undefined;

  return (
    <MonumentBackdrop
      variant="fixed"
      intensity={intensity}
      vertexHex={override ? scoreToMonumentVertexHex(override.score) : '#17E8F0'}
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
    // Do not enable LazyMotion strict mode here. Several app-shell and route
    // components still import `motion` directly, and strict mode turns those
    // legacy imports into runtime exceptions that push pages into the global
    // error boundary before interactive controls (including wallet connect)
    // can respond.
    <LazyMotion features={domAnimation}>
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
