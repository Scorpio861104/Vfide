import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Reports & Dashboards (Coming Soon)',
  description:
    'Cross-feature reporting and custom analytics — combining merchant analytics, ProofScore trends, treasury flow, and protocol-wide metrics. Designed and named in navigation, not yet shipped — see the existing per-feature dashboards for the analytics available today.',
  path: '/reporting',
  robots: { index: false },
});

export default function ReportingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
