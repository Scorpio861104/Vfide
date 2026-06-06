import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Remittance — Wallet-to-Wallet (Cash-Out Partners Coming Soon)',
  description:
    'Send VFIDE wallet-to-wallet across borders today (settlement in minutes on Base, 0.25%–1.00% fee). Direct cash-out into M-Pesa, MTN MoMo, GCash, or bank accounts requires regulated partners per corridor — those integrations are not yet live.',
  path: '/remittance',
});

export default function RemittanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
