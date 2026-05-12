'use client';

import { ReactNode, useEffect } from 'react';
import { registerServiceWorker } from '@/lib/sw-register';
import { usePathname } from 'next/navigation';
import { useAccount } from 'wagmi';
import { AppShell } from '@/components/navigation';
import { LiveProofScoreProvider } from '@/components/navigation/LiveProofScoreProvider';
import { RealtimeProvider, UserProvider } from '@/lib/data';
import { WizardMount } from '@/components/wizard/WizardMount';
import { WizardStateProvider } from '@/components/wizard/useWizardState';

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
            <AppShell>{children}</AppShell>
            <WizardMount />
          </WizardStateProvider>
        </LiveProofScoreProvider>
      </UserProvider>
    </RealtimeProvider>
  );
}
