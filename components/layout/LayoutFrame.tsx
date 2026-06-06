'use client';

import { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { LazyMotion, domAnimation } from 'framer-motion';

import { AppShell } from '@/components/navigation/AppShell';
import { RealtimeProvider } from '@/lib/data';
import { MonumentOverrideProvider, useMonumentOverride } from './MonumentOverrideContext';

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
 * hooks here, because the app chrome is in every route's first compile path.
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

interface LayoutFrameProps {
  children: ReactNode;
  pathname: string;
  walletEnabled: boolean;
  isConnected?: boolean;
}

export function LayoutFrame({ children, pathname, walletEnabled, isConnected }: LayoutFrameProps) {
  return (
    // Do not enable LazyMotion strict mode here. Several app-shell and route
    // components still import `motion` directly, and strict mode turns those
    // legacy imports into runtime exceptions that push pages into the global
    // error boundary before interactive controls (including wallet connect)
    // can respond.
    <LazyMotion features={domAnimation}>
      <RealtimeProvider wsUrl={process.env.NEXT_PUBLIC_WEBSOCKET_URL}>
        <MonumentOverrideProvider>
          <GlobalMonument pathname={pathname} />
          <AppShell walletEnabled={walletEnabled} isConnected={isConnected}>{children}</AppShell>
        </MonumentOverrideProvider>
      </RealtimeProvider>
    </LazyMotion>
  );
}
