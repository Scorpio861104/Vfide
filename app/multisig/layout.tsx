import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Guardian Approval Wallet (Coming Soon)',
  description:
    'Guardian Approval wallet for shared treasuries and high-value vaults — multiple trusted people approve before funds move. See Guardians for the protection available today.',
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
