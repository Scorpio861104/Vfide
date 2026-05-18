import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Appeals',
  description: 'Appeal a DAO decision affecting your vault.',
  path: '/appeals', robots: { index: false },
});

export default function AppealsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
