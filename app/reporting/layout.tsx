import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Reporting',
  description: 'Custom reports for your VFIDE merchant activity.',
  path: '/reporting', robots: { index: false },
});

export default function ReportingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
