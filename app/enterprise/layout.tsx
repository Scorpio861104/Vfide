import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Enterprise Payments',
  description: 'White-label VFIDE for high-volume merchant programs. Custom integrations, dedicated support, and bulk-tier ProofScore reputation.',
  path: '/enterprise',
});

export default function EnterpriseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
