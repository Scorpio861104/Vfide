import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Multisig',
  description: 'Manage your multisig vault configuration.',
  path: '/multisig', robots: { index: false },
});

export default function MultisigLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
