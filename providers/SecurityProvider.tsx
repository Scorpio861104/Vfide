'use client';

import type { ReactNode } from 'react';
import { SecurityProvider as SecurityInitializer } from '@/components/security/SecurityProvider';

export function SecurityProvider({ children }: { children: ReactNode }) {
  return (
    <>
      <SecurityInitializer />
      {children}
    </>
  );
}
