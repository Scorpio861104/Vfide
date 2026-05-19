import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Council Elections',
  description: 'Vote in DAO council elections.',
  path: '/elections', robots: { index: false },
});

export default function ElectionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
