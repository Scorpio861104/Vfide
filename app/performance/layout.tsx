import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Performance',
  description: 'Performance metrics for your merchant operation.',
  path: '/performance', robots: { index: false },
});

export default function PerformanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
