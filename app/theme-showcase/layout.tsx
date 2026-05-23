import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

// Redirects to /theme?tab=preview (see page.tsx); marked noindex so search
// engines don't dwell on the legacy URL.
export const metadata: Metadata = buildPageMetadata({
  title: 'Theme Showcase',
  description: 'Preview every VFIDE color theme, animation style, and visual customization option. Pick what feels right.',
  path: '/theme-showcase',
  robots: { index: false },
});

export default function ThemeShowcaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
