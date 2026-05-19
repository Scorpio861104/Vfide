import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Testnet Faucet & Onboarding',
  description: 'Get free testnet VFIDE tokens, gas, and a referral bonus. Try the protocol on Base Sepolia before mainnet launch.',
  path: '/testnet',
});

export default function TestnetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
