'use client';

import { ReactNode, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useAccount } from 'wagmi';

import { LiveProofScoreProvider } from '@/components/navigation/LiveProofScoreProvider';
import { UserProvider } from '@/lib/data';
import { WizardStateProvider } from '@/components/wizard/useWizardState';
import { Web3Providers } from '@/lib/providers/Web3Providers';
import { LayoutFrame } from './LayoutFrame';

const WizardMount = dynamic(() => import('@/components/wizard/WizardMount').then((mod) => mod.WizardMount), { ssr: false });

interface WalletClientLayoutProps {
  children: ReactNode;
  pathname: string;
}

function WalletLayoutInner({ children, pathname }: WalletClientLayoutProps) {
  const { address, isConnected } = useAccount();

  return (
    <UserProvider address={address}>
      <LiveProofScoreProvider>
        <WizardStateProvider>
          <LayoutFrame pathname={pathname} walletEnabled isConnected={isConnected}>{children}</LayoutFrame>
          <Suspense fallback={null}><WizardMount /></Suspense>
        </WizardStateProvider>
      </LiveProofScoreProvider>
    </UserProvider>
  );
}

/**
 * WalletClientLayout intentionally owns all Web3/wagmi/proof-score/wizard
 * imports. Marketing routes dynamically avoid this module so their first dev
 * compile does not pull the wallet/vault setup graph into pages like
 * /onboarding.
 */
export function WalletClientLayout({ children, pathname }: WalletClientLayoutProps) {
  return (
    <Web3Providers>
      <WalletLayoutInner pathname={pathname}>{children}</WalletLayoutInner>
    </Web3Providers>
  );
}
