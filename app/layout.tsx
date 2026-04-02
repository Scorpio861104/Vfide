/**
 * Root Layout — Server Component
 * 
 * Only CoreProviders (Tier 1) wrap the entire app.
 * Web3Providers (Tier 2) are pushed down into authenticated route group layouts.
 * Feature providers (Tier 3) are pushed into specific route group layouts.
 * 
 * This means:
 * - (marketing) pages ship ZERO Web3 JS
 * - (social) pages load presence/notification providers
 * - (gamification) pages load achievement providers
 * - All other authenticated pages get Web3 but nothing extra
 * 
 * MIGRATION:
 * Replace your existing app/layout.tsx with this.
 * Move all 15+ nested providers from root into the appropriate tier.
 */

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import '@rainbow-me/rainbowkit/styles.css';

import { CoreProviders } from '@/lib/providers/CoreProviders';
import { Navbar } from '@/components/layout/Navbar';

const inter = Inter({ subsets: ['latin'], variable: '--font-body' });

export const metadata: Metadata = {
  title: 'VFIDE — Trust-Scored DeFi Payments',
  description: 'Payment protocol for the financially excluded. Zero merchant fees. Non-custodial vaults. Social commerce.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://vfide.io'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="bg-zinc-950 text-white antialiased">
        <CoreProviders>
          <Navbar />
          {children}
        </CoreProviders>
      </body>
    </html>
  );
}
