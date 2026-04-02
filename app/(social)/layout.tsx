'use client';

import type { ReactNode } from 'react';

import { Footer } from '@/components/layout/Footer';
import { WalletGate } from '@/components/layout/WalletGate';
import { SocialProviders } from '@/lib/providers/FeatureProviders';
import { Web3Providers } from '@/lib/providers/Web3Providers';

export default function SocialLayout({ children }: { children: ReactNode }) {
  return (
    <Web3Providers>
      <SocialProviders>
        <WalletGate>
          <main className="min-h-screen pt-20">{children}</main>
          <Footer />
        </WalletGate>
      </SocialProviders>
    </Web3Providers>
  );
}
