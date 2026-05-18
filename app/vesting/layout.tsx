import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Vesting',
  description: 'Track your VFIDE vesting schedule.',
  path: '/vesting', robots: { index: false },
});

export default function VestingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
