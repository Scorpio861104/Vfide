import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Peer-to-Peer Lending',
  description: 'Browse and post peer-to-peer term loan offers co-signed by your guardian. 1\u201330 day duration, 12% APR cap. ProofScore reputation determines borrow limit.',
  path: '/lending', robots: { index: false },
});

export default function LendingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
