import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Crypto Tools',
  description: 'Crypto utilities for the VFIDE network.',
  path: '/crypto', robots: { index: false },
});

export default function CryptoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
