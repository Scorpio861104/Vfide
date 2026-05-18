import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Price Alerts',
  description: 'Set custom price alerts for VFIDE and your favorite tokens. Get notified when targets are hit.',
  path: '/price-alerts',
});

export default function PriceAlertsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
