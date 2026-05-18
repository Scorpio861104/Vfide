import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Taxes',
  description: 'Export your VFIDE transaction history for tax reporting.',
  path: '/taxes', robots: { index: false },
});

export default function TaxesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
