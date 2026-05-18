import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Trust Endorsements',
  description: 'See who has been endorsed by trusted vaults. Endorsements feed ProofScore and unlock lending and lower fees.',
  path: '/endorsements',
});

export default function EndorsementsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
