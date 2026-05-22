import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Developer Portal — Integration Preview',
  description:
    'Preview of the VFIDE developer integration surface: the @vfide/sdk npm package and public /v1 REST API are previewed here but not yet shipped. Webhooks and direct on-chain integration via viem/wagmi are available today.',
  path: '/developer',
});

export default function DeveloperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
