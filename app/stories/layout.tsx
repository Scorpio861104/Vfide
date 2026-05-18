import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Stories',
  description: 'Share short-form merchant stories with the network.',
  path: '/stories', robots: { index: false },
});

export default function StoriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
