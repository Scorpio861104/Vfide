'use client';

import type { ReactNode } from 'react';

import { Footer } from '@/components/layout/Footer';
import { WalletGate } from '@/components/layout/WalletGate';
import { Web3Providers } from '@/lib/providers/Web3Providers';

export default function GovernanceGroupLayout({ children }: { children: ReactNode }) {
  return (
    <Web3Providers>
      <WalletGate>
        <main className="min-h-screen pt-20">{children}</main>
        <Footer />
      </WalletGate>
    </Web3Providers>
  );
}
