import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

/**
 * /demo/* surfaces are interactive product demonstrations, not real
 * product pages. Excluded from search to avoid misleading users about
 * what the live product offers.
 */
export const metadata: Metadata = buildPageMetadata({
  title: 'Demo',
  description: 'Interactive product demonstrations.',
  path: '/demo',
  robots: { index: false, follow: false },
});

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
