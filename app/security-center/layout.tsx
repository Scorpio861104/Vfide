import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Security Center',
  description: 'Manage your vault security: guardians, app lock, and alerts.',
  path: '/security-center', robots: { index: false },
});

export default function SecurityCenterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
