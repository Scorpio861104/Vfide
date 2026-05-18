import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Staking',
  description:
    'Stake LP tokens to earn VFIDE liquidity incentives. Provides on-chain visibility into your stake amount, lockup status, and the pool totals.',
  path: '/staking',
  robots: { index: false },
});

export default function StakingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
