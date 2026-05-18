import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Theme',
  description: 'Customize your VFIDE experience.',
  path: '/theme', robots: { index: false },
});

export default function ThemeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
