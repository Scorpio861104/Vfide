/**
 * (governance) Route Group Layout
 * 
 * Pages: governance/, dao-hub/, council/, appeals/
 */
'use client';

import { ReactNode } from 'react';
import { Web3Providers } from '@/lib/providers/Web3Providers';
import { WalletGate } from '@/components/layout/WalletGate';
import { Footer } from '@/components/layout/Footer';

export default function GovernanceLayout({ children }: { children: ReactNode }) {
  return (
    <Web3Providers>
      <WalletGate>
        <main className="min-h-screen pt-20">{children}</main>
        <Footer />
      </WalletGate>
    </Web3Providers>
  );
}
