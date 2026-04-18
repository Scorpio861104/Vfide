/**
 * (seer) Route Group Layout
 * 
 * Pages: seer-service/, flashloan/, insights/, agent/
 */
'use client';

import { ReactNode } from 'react';
import { WalletGate } from '@/components/layout/WalletGate';
import { Footer } from '@/components/layout/Footer';

export default function SeerLayout({ children }: { children: ReactNode }) {
  return (
    <WalletGate>
      <main className="min-h-screen pt-20">{children}</main>
      <Footer />
    </WalletGate>
  );
}
