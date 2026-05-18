import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Council',
  description: 'View current council members and proposals.',
  path: '/council', robots: { index: false },
});

export default function CouncilLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
