import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Social Analytics',
  description: 'Your social engagement analytics.',
  path: '/social', robots: { index: false },
});

export default function SocialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
