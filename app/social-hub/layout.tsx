import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Social Hub',
  description: 'Your VFIDE social activity.',
  path: '/social-hub', robots: { index: false },
});

export default function SocialHubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
