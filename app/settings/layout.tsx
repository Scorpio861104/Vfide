import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Settings',
  description: 'Manage your VFIDE account settings, security, and preferences.',
  path: '/settings', robots: { index: false },
});

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
