import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Remittance',
  description: 'Send money across borders with VFIDE. Low fees, fast settlement, and trust-weighted beneficiary protection.',
  path: '/remittance',
});

export default function RemittanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
