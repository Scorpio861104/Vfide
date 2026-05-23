import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Cash Agent Mode (Coming Soon)',
  description:
    'Operator workflow for in-person cash-in/cash-out and customer support — for kiosks, corner stores, and mobile money agents serving walk-in customers. Designed and named in navigation, not yet shipped — see the Merchant Portal for the closest available workflow today.',
  path: '/agent',
  robots: { index: false },
});

export default function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
