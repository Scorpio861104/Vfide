/**
 * (gamification) Route Group Layout
 * 
 * Pages: quests/, achievements/, badges/, leaderboard/,
 *        headhunter/, rewards/, benefits/
 * 
 * Adds GamificationProviders (Tier 3) for achievement toasts.
 */
'use client';

import { ReactNode } from 'react';
import { Web3Providers } from '@/lib/providers/Web3Providers';
import { GamificationProviders } from '@/lib/providers/FeatureProviders';
import { WalletGate } from '@/components/layout/WalletGate';
import { Footer } from '@/components/layout/Footer';

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
