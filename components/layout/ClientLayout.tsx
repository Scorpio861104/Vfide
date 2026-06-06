'use client';

import { ReactNode, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { registerServiceWorker } from '@/lib/sw-register';
import { usePathname } from 'next/navigation';
import { PieMenuContextProvider } from '@/components/navigation/PieMenuContext';
import { UserProvider } from '@/lib/data';
import { LayoutFrame } from './LayoutFrame';

const WalletClientLayout = dynamic(
  () => import('./WalletClientLayout').then((mod) => mod.WalletClientLayout),
  { ssr: false, loading: () => null },
);

const WALLET_DISABLED_ROUTES = new Set(['/', '/about', '/docs', '/onboarding']);

function isWalletDisabledRoute(pathname: string): boolean {
  return WALLET_DISABLED_ROUTES.has(pathname);
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

function MarketingLayout({ children, pathname }: ClientLayoutProps & { pathname: string }) {
  return (
    <UserProvider>
      <PieMenuContextProvider score={5000}>
        <LayoutFrame pathname={pathname} walletEnabled={false}>{children}</LayoutFrame>
      </PieMenuContextProvider>
    </UserProvider>
  );
}

export function ClientLayout({ children }: ClientLayoutProps) {
  const pathname = usePathname();

  useEffect(() => { registerServiceWorker(); }, []);
  useRouteAnnouncement(pathname);

  if (isWalletDisabledRoute(pathname)) {
    return <MarketingLayout pathname={pathname}>{children}</MarketingLayout>;
  }

  return <WalletClientLayout pathname={pathname}>{children}</WalletClientLayout>;
}
