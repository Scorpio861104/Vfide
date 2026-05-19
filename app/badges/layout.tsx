import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Badges & Achievements',
  description: 'Collect VFIDE badges as you transact, endorse, and earn. Badge NFTs are publicly verifiable proof of participation.',
  path: '/badges',
});

export default function BadgesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
