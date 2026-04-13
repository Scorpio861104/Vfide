/**
 * Tier 2 Providers — Web3 + Wallet + Security
 * 
 * Loaded in (auth), (finance), (commerce), (governance), (social),
 * (security), (gamification) route group layouts.
 * 
 * NOT loaded in (marketing) — those are pure RSC with zero client JS.
 */
'use client';

import { ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from '@/lib/wagmi';
import { SecurityProvider } from '@/providers/SecurityProvider';
import { useWalletPersistence } from '@/hooks/useWalletPersistence';

function WalletPersistenceManager({ children }: { children: ReactNode }) {
  useWalletPersistence();
  return <>{children}</>;
}

// Single QueryClient instance — shared across all authenticated routes.
// Stale-while-revalidate: contract reads cached 30s, refetch on window focus.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      retry: 2,
    },
  },
});

export function Web3Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig} reconnectOnMount={true}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <SecurityProvider>
            <WalletPersistenceManager>{children}</WalletPersistenceManager>
          </SecurityProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
