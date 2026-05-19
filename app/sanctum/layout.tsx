import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Sanctum — Verified Charities',
  description: 'Donate to DAO-verified charities with on-chain proof. Sanctum routes 20% of network fees to vetted causes worldwide.',
  path: '/sanctum',
});

export default function SanctumLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
