import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'ProofScore — On-Chain Trust',
  description: 'How ProofScore works: a 0–10,000 trust score earned through transactions, endorsements, and tenure. The lower the score the higher the fee.',
  path: '/proofscore',
});

export default function ProofscoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
