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
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from '@/lib/wagmi';
import { SecurityProvider } from '@/providers/SecurityProvider';
import { useWalletPersistence } from '@/hooks/useWalletPersistence';
import { useAuth } from '@/hooks/useAPI';

// VFIDE custom RainbowKit dark theme — matches zinc-950 background + cyan-400 accent
const vfideDarkTheme = darkTheme({
  accentColor: '#22d3ee',        // cyan-400
  accentColorForeground: '#030712', // zinc-950
  borderRadius: 'large',
  fontStack: 'system',
  overlayBlur: 'large',
});

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
 *   3. FIX UX-4: 1.5s settle delay before SIWE prompt — lets wagmi reconnect
 *      fully stabilise so users don't see an immediate sign-request flash on
 *      every page load when their wallet is already connected.
 */
function WalletAuthManager() {
  const { isConnected, address } = useAccount();
  const { authenticate, isAuthenticated, isCheckingSession, isAuthenticating } = useAuth();
  const lastAttemptAddress = useRef<string | undefined>(undefined);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Wait for the initial verifyToken() round-trip; if the cookie is
    // valid we'll already be authenticated by the time this resolves.
    if (isCheckingSession) return;
    if (isAuthenticating) return;
    if (!isConnected) {
      lastAttemptAddress.current = undefined;
      // Cancel any pending settle timer on disconnect
      if (settleTimerRef.current) {
        clearTimeout(settleTimerRef.current);
        settleTimerRef.current = null;
      }
      return;
    }
    if (!address) return;
    if (isAuthenticated) return;
    // Already tried for this address in this session — don't loop.
    if (lastAttemptAddress.current === address) return;

    lastAttemptAddress.current = address;

    // Settle delay: wait 1.5s before triggering SIWE so that:
    // a) wagmi's reconnect flow fully resolves first
    // b) users don't see an immediate sign popup on page reload
    settleTimerRef.current = setTimeout(() => {
      settleTimerRef.current = null;
      void authenticate();
    }, 1500);

    return () => {
      if (settleTimerRef.current) {
        clearTimeout(settleTimerRef.current);
        settleTimerRef.current = null;
      }
    };
  }, [isConnected, address, isAuthenticated, isCheckingSession, isAuthenticating, authenticate]);

  return null;
}

// Single QueryClient instance — shared across all authenticated routes.
// FIX PERF-3: staleTime raised to 60s (was 30s); refetchOnWindowFocus disabled
// for contract reads — window-focus refetches flood the RPC on every tab switch.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      // Disable automatic refetch on window focus globally — individual queries
      // that need live data should opt-in explicitly via refetchInterval instead.
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
});

export function Web3Providers({ children }: { children: ReactNode }) {
  return (
    // FIX PERF-1: reconnectOnMount=false — useWalletPersistence already handles
    // reconnection with its own session-aware logic. Having both active caused
    // two simultaneous reconnect attempts on every page load (one from WagmiProvider,
    // one from the hook), which triggered duplicate RPC calls and delayed the
    // connected state by an extra round-trip.
    <WagmiProvider config={wagmiConfig} reconnectOnMount={false}>
      <QueryClientProvider client={queryClient}>
        {/*
          FIX UX-2: vfideDarkTheme applied — RainbowKit modal now matches VFIDE's
          zinc-950 background and cyan-400 accent instead of the default rainbow palette.
          Wallet stack intentionally remains RainbowKit.
          Do not swap to VFIDEWalletProvider until:
          1) authenticateWithProvider is wired to a real SDK
          2) ensureVaultExists is implemented against VaultHub
        */}
        <RainbowKitProvider theme={vfideDarkTheme}>
          <SecurityProvider>
            <WalletAuthManager />
            <WalletPersistenceManager>{children}</WalletPersistenceManager>
          </SecurityProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
