import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Quests & Onboarding',
  description: 'Complete onboarding quests to grow your ProofScore. Unlock badges, fee discounts, and lending eligibility.',
  path: '/quests',
});

export default function QuestsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
