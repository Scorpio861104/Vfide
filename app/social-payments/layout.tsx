import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Social Payments',
  description: 'Send and receive payments through social channels.',
  path: '/social-payments', robots: { index: false },
});

export default function SocialPaymentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
