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
 *
 * Important behaviors:
 *   1. Waits for `isCheckingSession` to clear before triggering — otherwise
 *      users with a valid httpOnly cookie get re-prompted on every page
 *      reload while the cookie check is still in flight.
 *   2. Tracks the last attempted address so a single failed/refused signin
 *      doesn't loop. The user must explicitly retry by disconnecting and
 *      reconnecting (or by triggering a manual sign-in flow).
 */
function WalletAuthManager() {
  const { isConnected, address } = useAccount();
  const { authenticate, isAuthenticated, isCheckingSession, isAuthenticating } = useAuth();
  const lastAttemptAddress = useRef<string | undefined>(undefined);

  useEffect(() => {
    // Wait for the initial verifyToken() round-trip; if the cookie is
    // valid we'll already be authenticated by the time this resolves.
    if (isCheckingSession) return;
    if (isAuthenticating) return;
    if (!isConnected) {
      lastAttemptAddress.current = undefined;
      return;
    }
    if (!address) return;
    if (isAuthenticated) return;
    // Already tried for this address in this session — don't loop.
    if (lastAttemptAddress.current === address) return;
    lastAttemptAddress.current = address;
    void authenticate();
  }, [isConnected, address, isAuthenticated, isCheckingSession, isAuthenticating, authenticate]);

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
