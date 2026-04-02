'use client';

import type { ReactNode } from 'react';

import { Footer } from '@/components/layout/Footer';
import { WalletGate } from '@/components/layout/WalletGate';
import { GamificationProviders } from '@/lib/providers/FeatureProviders';
import { Web3Providers } from '@/lib/providers/Web3Providers';

export default function GamificationLayout({ children }: { children: ReactNode }) {
  return (
    <Web3Providers>
      <GamificationProviders>
        <WalletGate>
          <main className="min-h-screen pt-20">{children}</main>
          <Footer />
        </WalletGate>
      </GamificationProviders>
    </Web3Providers>
  );
}
