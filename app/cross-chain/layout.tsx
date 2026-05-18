import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Cross-Chain Transfers',
  description: 'Move VFIDE and other assets between Base, Polygon, and zkSync. Secure cross-chain bridging.',
  path: '/cross-chain',
});

export default function CrossChainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
