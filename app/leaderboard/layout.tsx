import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'ProofScore Leaderboard',
  description: 'Top trust-rated vaults across the network, ranked by ProofScore. Publicly verifiable on-chain reputation.',
  path: '/leaderboard',
});

export default function LeaderboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
