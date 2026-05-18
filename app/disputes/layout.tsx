import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Disputes',
  description: 'Review and respond to open disputes.',
  path: '/disputes', robots: { index: false },
});

export default function DisputesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
