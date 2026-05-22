import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Multi-Signature Wallet (Coming Soon)',
  description:
    'Multi-signature wallet for shared treasuries and high-value vaults. Designed and named in navigation, not yet shipped — see Guardians for the recovery protection available today.',
  path: '/multisig',
  robots: { index: false },
});

export default function MultisigLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
