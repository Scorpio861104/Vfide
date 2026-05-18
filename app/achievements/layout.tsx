import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Achievements',
  description: 'Track your VFIDE achievements: transactions, endorsements, badges earned, and ProofScore milestones.',
  path: '/achievements',
});

export default function AchievementsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
