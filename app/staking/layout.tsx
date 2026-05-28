import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Staking',
  description:
    'Liquidity coordination pool — stake LP tokens to participate in protocol liquidity tracking. No yield or token distributions. Provides on-chain visibility into stake amount, lockup status, and pool totals.',
  path: '/staking',
  robots: { index: false },
});

export default function StakingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
