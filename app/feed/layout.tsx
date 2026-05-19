import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Activity Feed',
  description: 'Live feed of network activity. New vaults, large payments, ProofScore milestones, and merchant signups.',
  path: '/feed',
});

export default function FeedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
