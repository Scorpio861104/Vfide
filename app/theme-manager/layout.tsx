import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Theme Manager',
  description: 'Manage your saved VFIDE themes.',
  path: '/theme-manager', robots: { index: false },
});

export default function ThemeManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
