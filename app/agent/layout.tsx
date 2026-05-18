import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Agent',
  description: 'Manage your AI agent permissions.',
  path: '/agent', robots: { index: false },
});

export default function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
