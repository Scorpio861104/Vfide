import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Token Streaming',
  description: 'Manage continuous token streams.',
  path: '/streaming', robots: { index: false },
});

export default function StreamingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
