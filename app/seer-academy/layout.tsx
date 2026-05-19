import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Seer Academy',
  description: 'Learn how ProofScore works, what trust signals matter, and how to build a high-score vault. Free educational content.',
  path: '/seer-academy',
});

export default function SeerAcademyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
