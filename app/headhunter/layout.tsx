import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Headhunter Program',
  description: 'Refer creators and merchants to VFIDE and earn from the headhunter pool. Trust-weighted referrals, paid in VFIDE.',
  path: '/headhunter',
});

export default function HeadhunterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
