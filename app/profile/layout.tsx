import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Profile',
  description: 'Your VFIDE profile.',
  path: '/profile', robots: { index: false },
});

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
