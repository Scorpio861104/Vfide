import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Wallet',
  description: 'Manage your VFIDE wallet, choose between hardware or paper wallet setup, and access your vault.',
  path: '/wallet',
  robots: { index: false },
});

export default function WalletLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
