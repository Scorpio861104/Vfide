'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { PieMenu } from './PieMenu';

// Pie menu navigation is intended to be the single shared shell across the
// product, while truly embedded/standalone surfaces stay chrome-free.
const EXCLUDED_PATHS = [
  '/embed',
  '/s/',
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
      {children}
      <PieMenu />
    </>
  );
}
