/**
 * Tier 2 Providers — Web3 + Wallet + Security
 * 
 * Loaded in (auth), (finance), (commerce), (governance), (social),
 * (security), (gamification) route group layouts.
 * 
 * NOT loaded in (marketing) — those are pure RSC with zero client JS.
 */
'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { WagmiProvider, useAccount } from 'wagmi';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from '@/lib/wagmi';
import { SecurityProvider } from '@/providers/SecurityProvider';
import { useWalletPersistence } from '@/hooks/useWalletPersistence';
import { useAuth } from '@/hooks/useAPI';

function WalletPersistenceManager({ children }: { children: ReactNode }) {
  useWalletPersistence();
  return <>{children}</>;
}

/**
 * Triggers SIWE challenge-sign when a wallet connects for the first time
 * in the session. Re-runs if address changes (account switch).
 */
function WalletAuthManager() {
  const { isConnected, address } = useAccount();
  const { authenticate, isAuthenticated } = useAuth();
  const lastAuthAddress = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (isConnected && address && !isAuthenticated && lastAuthAddress.current !== address) {
      lastAuthAddress.current = address;
      void authenticate();
    }
    if (!isConnected) {
      lastAuthAddress.current = undefined;
    }
  }, [isConnected, address, isAuthenticated, authenticate]);

  return null;
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
        {/*
          Wallet stack intentionally remains RainbowKit.
          Do not swap to VFIDEWalletProvider until:
          1) authenticateWithProvider is wired to a real SDK
          2) ensureVaultExists is implemented against VaultHub
        */}
        <RainbowKitProvider>
          <SecurityProvider>
            <WalletAuthManager />
            <WalletPersistenceManager>{children}</WalletPersistenceManager>
          </SecurityProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
