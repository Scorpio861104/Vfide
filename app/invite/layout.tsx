import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Invite Friends',
  description: 'Refer friends to VFIDE and earn from the referral pool. Trust-weighted invites, paid in VFIDE.',
  path: '/invite',
});

export default function InviteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
