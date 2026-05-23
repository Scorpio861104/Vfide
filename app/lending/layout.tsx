import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Peer-to-Peer Lending (Coming Soon)',
  description:
    'Peer-to-peer loans co-signed by your guardian, with ProofScore-based limits and default penalties. Designed and named in navigation, not yet shipped — see Direct Pay for trusted lender-borrower workflows handled off-platform today.',
  path: '/lending',
  robots: { index: false },
});

export default function LendingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
