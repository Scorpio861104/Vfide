import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Scan',
  description: 'Scan a payment QR code.',
  path: '/scan', robots: { index: false },
});

export default function ScanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
