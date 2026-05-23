'use client';

import * as React from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from '@/lib/wagmi';
import { getCachePolicy } from '@/lib/cache/cacheInvalidationPolicy';

const walletStateCachePolicy = getCachePolicy('reactQuery:wallet-state');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: walletStateCachePolicy.ttlMs,
      gcTime: walletStateCachePolicy.gcMs,
    },
  },
});

interface Web3ProviderProps {
  children: React.ReactNode;
}

/**
 * Web3Provider wraps the app with Wagmi + React Query providers.
 * Uses centralized cache policy for wallet-state stale/gc times.
 */
export function Web3Provider({ children }: Web3ProviderProps) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

export default Web3Provider;
