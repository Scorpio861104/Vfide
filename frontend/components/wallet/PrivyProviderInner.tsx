"use client";

import { PrivyProvider } from '@privy-io/react-auth';
import { WagmiProvider, createConfig } from '@privy-io/wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http } from 'viem';
import { zkSyncSepoliaTestnet } from 'viem/chains';
import { ReactNode, useState } from 'react';

// Get Privy App ID from environment
const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || '';

interface Props {
  children: ReactNode;
}

export function PrivyProviderInner({ children }: Props) {
  // Create clients inside component to ensure fresh instances
  const [queryClient] = useState(() => new QueryClient());
  
  const [wagmiConfig] = useState(() => createConfig({
    chains: [zkSyncSepoliaTestnet],
    transports: {
      [zkSyncSepoliaTestnet.id]: http('https://sepolia.era.zksync.dev'),
    },
  }));

  if (!PRIVY_APP_ID) {
    return (
      <div className="min-h-screen bg-red-900 flex items-center justify-center">
        <div className="text-center text-white p-8">
          <h1 className="text-2xl font-bold mb-4">Configuration Error</h1>
          <p>PRIVY_APP_ID is not set. Please configure environment variables.</p>
        </div>
      </div>
    );
  }

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        // Set zkSync Sepolia as the default and ONLY chain
        defaultChain: zkSyncSepoliaTestnet,
        supportedChains: [zkSyncSepoliaTestnet],
        
        // Appearance - match VFIDE branding
        appearance: {
          theme: 'dark',
          accentColor: '#8B5CF6', // Purple
          logo: 'https://vfide.io/logo.png',
          showWalletLoginFirst: false, // Email first for simplicity
          walletChainType: 'ethereum-only',
        },
        
        // Login methods - simple options first
        loginMethods: ['email', 'google', 'wallet'],
        
        // Embedded wallets - auto-create for users without wallets
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
        },
        
        // Legal
        legal: {
          termsAndConditionsUrl: 'https://vfide.io/legal',
          privacyPolicyUrl: 'https://vfide.io/legal',
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <WagmiProvider config={wagmiConfig as any} reconnectOnMount={false}>
          {children}
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
