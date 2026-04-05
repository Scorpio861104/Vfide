'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { TopNav } from './TopNav';
import { BottomTabBar } from './BottomTabBar';
import { SubNav } from './SubNav';
import { PieMenu } from './PieMenu';

// Pages that should NOT show the app navigation
// (marketing pages, embeds, auth flows, standalone pages)
const EXCLUDED_PATHS = [
  '/',              // Landing page
  '/about',
  '/legal',
  '/docs',
  '/live-demo',
  '/demo',
  '/invite',
  '/setup',
  '/testnet',
  '/developer',
  '/admin',
  '/control-panel',
  '/embed',
  '/s/',            // Marketing short links
  '/theme',
  '/theme-manager',
  '/theme-showcase',
];

function shouldShowNav(pathname: string): boolean {
  return !EXCLUDED_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
}

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const showNav = shouldShowNav(pathname);

  if (!showNav) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Desktop top nav */}
      <TopNav />

      {/* Contextual sub-navigation (horizontal tabs) */}
      <SubNav />

      {/* Page content with spacing for fixed nav bars */}
      <div className="md:pt-14 pb-20 md:pb-0">
        {children}
      </div>

      {/* Mobile bottom tab bar */}
      <BottomTabBar />

      {/* Power-user pie navigation (floating V button) */}
      <PieMenu />
    </>
  );
}
