'use client';

import type { ReactNode } from 'react';
import { PresenceManager as PresenceIndicator } from '@/components/social/PresenceManager';

export function PresenceManager({ children }: { children: ReactNode }) {
  return (
    <>
      <PresenceIndicator />
      {children}
    </>
  );
}
