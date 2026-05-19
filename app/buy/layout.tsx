import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Buy VFIDE',
  description: 'On-ramp into VFIDE.',
  path: '/buy', robots: { index: false },
});

export default function BuyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
