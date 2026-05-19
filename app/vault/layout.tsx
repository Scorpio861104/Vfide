import type { Metadata } from 'next';
import { VaultSubNav } from '@/components/navigation/VaultSubNav';

export const metadata: Metadata = {
  title: 'Your Vault - VFIDE',
  description:
    'Manage your VFIDE vault. Deposits, withdrawals, guardian setup, and social recovery controls.',
};

export default function VaultLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* T2-1: Vault sub-nav shows on every /vault/* page so users
          always know where they are and can jump to sibling pages. */}
      <VaultSubNav />
      {children}
    </>
  );
}
