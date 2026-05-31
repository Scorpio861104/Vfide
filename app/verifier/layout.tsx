import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

/**
 * /verifier is the trusted-verifier console — only protocol-attested
 * verifier addresses can vote on vault recovery claims here. The page
 * is reachable by anyone (so claimants can see status) but the action
 * UI gates on on-chain trustedVerifier(address) checks. We keep it out
 * of search results because it isn't a product surface end users should
 * land on cold.
 */
export const metadata: Metadata = buildPageMetadata({
  title: 'Trusted Verifier Console',
  description: 'Operator console for protocol-attested verifiers to vote on vault recovery claims.',
  path: '/verifier',
  robots: { index: false, follow: false },
});

export default function VerifierLayout({ children }: { children: React.ReactNode }) {
  return children;
}
