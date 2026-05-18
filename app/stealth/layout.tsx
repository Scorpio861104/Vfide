import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Stealth Addresses',
  description: 'Generate one-time stealth addresses for private payments.',
  path: '/stealth', robots: { index: false },
});

export default function StealthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
