import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Flash Loans',
  description: 'Deposit VFIDE liquidity to earn fees from atomic single-transaction loans, or look up integration details for building a flash-loan receiver contract.',
  path: '/flashloans', robots: { index: false },
});

export default function FlashloansLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
