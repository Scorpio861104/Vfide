import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Money Streaming (Coming Soon)',
  description:
    'Continuous payment streams (Superfluid/Sablier-style) for salaries, vesting, and subscriptions. Designed and named in navigation, not yet shipped — see merchant subscription plans for fixed-schedule billing available today.',
  path: '/streaming',
  robots: { index: false },
});

export default function StreamingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
