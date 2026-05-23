import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

/**
 * /api-coverage is an internal developer dashboard tracking which API
 * endpoints have frontend coverage. Not user-facing.
 */
export const metadata: Metadata = buildPageMetadata({
  title: 'API Coverage',
  description: 'Internal developer dashboard tracking API endpoint coverage.',
  path: '/api-coverage',
  robots: { index: false, follow: false },
});

export default function ApiCoverageLayout({ children }: { children: React.ReactNode }) {
  return children;
}
