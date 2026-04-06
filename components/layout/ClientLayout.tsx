'use client';

import { ReactNode, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAccount } from 'wagmi';
import { AppShell } from '@/components/navigation';
import { RealtimeProvider, UserProvider } from '@/lib/data';

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
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') return;
    navigator.serviceWorker.register('/service-worker.js', { scope: '/' }).catch(() => {});
  }, []);

  useRouteAnnouncement(pathname);

  return (
    <RealtimeProvider wsUrl={process.env.NEXT_PUBLIC_WEBSOCKET_URL}>
      <UserProvider address={address}>
        <AppShell>{children}</AppShell>
      </UserProvider>
    </RealtimeProvider>
  );
}
