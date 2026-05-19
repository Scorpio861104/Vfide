import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Setup',
  description: 'Configure your VFIDE account.',
  path: '/setup', robots: { index: false },
});

export default function SetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
