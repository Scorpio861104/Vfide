import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Rewards',
  description: 'Earn VFIDE for using the network. Loyalty rewards, referral bonuses, and ProofScore-tier perks.',
  path: '/rewards',
});

export default function RewardsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
