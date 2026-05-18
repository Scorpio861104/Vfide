import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'For Merchants',
  description: 'Accept crypto payments with zero processor fees. ProofScore-based trust ratings, instant settlement, and self-custody.',
  path: '/merchants',
});

export default function MerchantsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
