import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Escrow',
  description: 'Manage your active escrow positions.',
  path: '/escrow', robots: { index: false },
});

export default function EscrowLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
