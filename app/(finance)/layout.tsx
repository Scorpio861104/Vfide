/**
 * (finance) Route Group Layout
 * 
 * Pages: vault/, treasury/, vesting/, payroll/, escrow/,
 *        streaming/, subscriptions/, budgets/, taxes/, time-locks/
 * 
 * MIGRATION:
 * Move all finance-related folders into app/(finance)/
 */
'use client';

import { ReactNode } from 'react';
import { WalletGate } from '@/components/layout/WalletGate';
import { Footer } from '@/components/layout/Footer';

export default function FinanceLayout({ children }: { children: ReactNode }) {
  return (
    <WalletGate>
      <main className="min-h-screen pt-20">{children}</main>
      <Footer />
    </WalletGate>
  );
}
