import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Revenue Splitter',
  description:
    'Trigger payout distribution from a deployed RevenueSplitter contract. Anyone can distribute held funds; the split among payees is fixed by the splitter owner with a timelock.',
  path: '/splitter',
  robots: { index: false },
});

export default function SplitterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
