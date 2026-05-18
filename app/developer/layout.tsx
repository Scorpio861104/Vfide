import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Developer SDK & API',
  description: 'Accept VFIDE payments in your app. SDK, webhooks, REST API, and integration guides for merchants and developers.',
  path: '/developer',
});

export default function DeveloperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
