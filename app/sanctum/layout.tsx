import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Sanctum — Verified Charities',
  description: 'Donate to DAO-verified charities with on-chain proof. Sanctum receives ~20% of network fees (composite of BurnRouter and FeeDistributor allocations) to fund vetted causes worldwide.',
  path: '/sanctum',
});

export default function SanctumLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
