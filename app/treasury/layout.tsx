import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Treasury',
  description: 'View VFIDE protocol treasury balances and flows.',
  path: '/treasury', robots: { index: false },
});

export default function TreasuryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
