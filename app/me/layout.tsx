import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Your Profile',
  description: 'Manage your VFIDE profile, public details, and trust signals.',
  path: '/me', robots: { index: false },
});

export default function MeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
