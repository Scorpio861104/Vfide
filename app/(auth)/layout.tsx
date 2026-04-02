/**
 * (auth) Route Group Layout — Authenticated core pages
 * 
 * Pages: dashboard, profile, settings, notifications
 * 
 * Adds Web3Providers (Tier 2) + wallet-gate.
 * 
 * MIGRATION:
 * 1. Move these folders into app/(auth)/:
 *    dashboard/, profile/, settings/, notifications/
 * 2. Each page.tsx can remove its own ConnectButton fallback —
 *    the WalletGate here handles it at the layout level.
 */
'use client';

import { ReactNode } from 'react';
import { Web3Providers } from '@/lib/providers/Web3Providers';
import { WalletGate } from '@/components/layout/WalletGate';
import { Footer } from '@/components/layout/Footer';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Web3Providers>
      <WalletGate>
        <main className="min-h-screen pt-20">{children}</main>
        <Footer />
      </WalletGate>
    </Web3Providers>
  );
}
