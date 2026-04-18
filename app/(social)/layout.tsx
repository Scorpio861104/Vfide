/**
 * (social) Route Group Layout
 * 
 * Pages: social/, social-hub/, social-messaging/, social-payments/,
 *        feed/, stories/, endorsements/, friends/
 * 
 * Adds SocialProviders (Tier 3) for presence + notifications.
 */
'use client';

import { ReactNode } from 'react';
import { SocialProviders } from '@/lib/providers/FeatureProviders';
import { WalletGate } from '@/components/layout/WalletGate';
import { Footer } from '@/components/layout/Footer';

export default function SocialLayout({ children }: { children: ReactNode }) {
  return (
    <SocialProviders>
      <WalletGate>
        <main className="min-h-screen pt-20">{children}</main>
        <Footer />
      </WalletGate>
    </SocialProviders>
  );
}
