/**
 * (commerce) Route Group Layout
 * 
 * Pages: merchant/, merchants/, marketplace/, store/, product/,
 *        pos/, buy/, checkout/, pay/
 * 
 * Adds CommerceProviders (Tier 3) for cart state + checkout flow.
 */
'use client';

import { ReactNode } from 'react';
import { Web3Providers } from '@/lib/providers/Web3Providers';
import { CommerceProviders } from '@/lib/providers/FeatureProviders';
import { WalletGate } from '@/components/layout/WalletGate';
import { Footer } from '@/components/layout/Footer';

export default function CommerceLayout({ children }: { children: ReactNode }) {
  return (
    <Web3Providers>
      <CommerceProviders>
        <WalletGate>
          <main className="min-h-screen pt-20">{children}</main>
          <Footer />
        </WalletGate>
      </CommerceProviders>
    </Web3Providers>
  );
}
