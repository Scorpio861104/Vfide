import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Payroll',
  description: 'Manage team payments and streaming salaries.',
  path: '/payroll', robots: { index: false },
});

export default function PayrollLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
