import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Hardware Wallet',
  description: 'Connect a hardware wallet to your VFIDE vault.',
  path: '/hardware-wallet', robots: { index: false },
});

export default function HardwareWalletLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
