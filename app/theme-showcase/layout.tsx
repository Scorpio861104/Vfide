import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Theme Showcase',
  description: 'Preview every VFIDE color theme, animation style, and visual customization option. Pick what feels right.',
  path: '/theme-showcase',
});

export default function ThemeShowcaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
