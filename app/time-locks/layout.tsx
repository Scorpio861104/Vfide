import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Transaction Time Locks (Coming Soon)',
  description:
    'User-configurable delays on outgoing transactions for defense against key compromise. Designed and named in navigation, not yet shipped — see CardBoundVault\'s existing withdrawal queue for the closest available protection today.',
  path: '/time-locks',
  robots: { index: false },
});

export default function TimeLocksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
