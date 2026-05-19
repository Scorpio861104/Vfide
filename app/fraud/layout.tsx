import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Trust & Fraud Reporting',
  description: 'File a complaint or check the trust status of a vault.',
  path: '/fraud', robots: { index: false },
});

export default function FraudLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
