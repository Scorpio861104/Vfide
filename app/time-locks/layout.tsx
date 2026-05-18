import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Time Locks',
  description: 'Manage your time-locked vault transactions.',
  path: '/time-locks', robots: { index: false },
});

export default function TimeLocksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
