import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Member Benefits',
  description: 'Tier rewards, fee discounts, lending eligibility, and other benefits unlocked as your ProofScore grows.',
  path: '/benefits',
});

export default function BenefitsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
