/**
 * Tier 2 Providers — Web3 + Wallet + Security
 *
 * Loaded in (auth), (finance), (commerce), (governance), (social),
 * (security), (gamification) route group layouts.
 *
 * NOT loaded in (marketing) — those are pure RSC with zero client JS.
 */
'use client';

import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { WagmiProvider, useAccount } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from '@/lib/wagmi';
import { CURRENT_CHAIN_ID } from '@/lib/testnet';
import { SecurityProvider } from '@/providers/SecurityProvider';
import { RainbowKitStyles } from './RainbowKitStyles';
import { useWalletPersistence } from '@/hooks/useWalletPersistence';
import { useAuth } from '@/hooks/useAPI';

// ── Dynamic RainbowKit theme ─────────────────────────────────────────────────
// Reads --accent CSS var on mount and whenever the user switches theme presets,
// so the modal accent colour always matches the active VFIDE theme instead of
// being pinned to the hardcoded default cyan-400 (#22d3ee).
function useRainbowKitTheme() {
  // SSR-safe default — will be replaced on first client paint
  const [accentColor, setAccentColor] = useState('#22d3ee');

  useEffect(() => {
    function syncAccent() {
      const raw = getComputedStyle(document.documentElement)
        .getPropertyValue('--accent')
        .trim();
      if (raw) setAccentColor(raw);
    }
    syncAccent();

    // Re-sync whenever a theme switch writes new vars onto <html style="…">
    const mo = new MutationObserver(syncAccent);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style'],
    });
    return () => mo.disconnect();
  }, []);

  return darkTheme({
    accentColor,
    accentColorForeground: '#030712', // zinc-950
    borderRadius: 'large',
    fontStack: 'system',
    overlayBlur: 'large',
  });
}

// Separate component so the hook runs inside the already-client-bounded tree
function ThemedRainbowKitProvider({ children }: { children: ReactNode }) {
  const theme = useRainbowKitTheme();
  return (
    <RainbowKitProvider theme={theme} initialChain={CURRENT_CHAIN_ID}>
      {children}
    </RainbowKitProvider>
  );
}

// ── WalletPersistenceManager ─────────────────────────────────────────────────
function WalletPersistenceManager({ children }: { children: ReactNode }) {
  useWalletPersistence();
  return <>{children}</>;
}

// ── WalletAuthManager (SIWE) ─────────────────────────────────────────────────
/**
 * Triggers SIWE challenge-sign when a wallet connects for the first time
 * in the session. Re-runs if address changes (account switch).
 *
 * Key behaviours:
 *   1. Waits for isCheckingSession to clear — users with a valid httpOnly
 *      cookie must not be re-prompted on every page reload.
 *   2. Tracks the last attempted address to avoid looping on refusal.
 *   3. FIX UX-4: 1.5 s settle delay before SIWE — lets wagmi reconnect
 *      fully stabilise so the sign popup never appears mid-page-load.
 */
function WalletAuthManager() {
  const { isConnected, address } = useAccount();
  const { authenticate, isAuthenticated, isCheckingSession, isAuthenticating } =
    useAuth();
  const lastAttemptAddress = useRef<string | undefined>(undefined);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isCheckingSession) return;
    if (isAuthenticating) return;
    if (!isConnected) {
      lastAttemptAddress.current = undefined;
      if (settleTimerRef.current) {
        clearTimeout(settleTimerRef.current);
        settleTimerRef.current = null;
      }
      return;
    }
    if (!address) return;
    if (isAuthenticated) return;
    if (lastAttemptAddress.current === address) return;

    lastAttemptAddress.current = address;

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
  }, [
    isConnected,
    address,
    isAuthenticated,
    isCheckingSession,
    isAuthenticating,
    authenticate,
  ]);

  return null;
}

// ── QueryClient ──────────────────────────────────────────────────────────────
// Single instance shared across all authenticated routes.
// FIX PERF-3: staleTime=60 s; refetchOnWindowFocus disabled to stop RPC floods
// on tab-switch.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
});

// ── Root export ──────────────────────────────────────────────────────────────
// Marketing routes that render without any Web3/wallet context.
// These pages don't connect wallets — loading wagmi/RainbowKit adds ~65KB gz for nothing.
const MARKETING_PREFIXES = ['/', '/about', '/docs', '/onboarding', '/seer-academy', '/merchants'];

function isMarketingRoute(path: string): boolean {
  return MARKETING_PREFIXES.some((prefix) => {
    if (prefix === '/') return path === '/';
    return path === prefix || path.startsWith(prefix + '/');
  });
}

export function Web3Providers({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Skip the entire wallet stack for pure-marketing pages.
  // Children render normally; they just won't have wallet context.
  if (isMarketingRoute(pathname ?? '')) {
    return <>{children}</>;
  }

  return (
    // FIX PERF-1: reconnectOnMount=false — useWalletPersistence handles
    // reconnection; having both active caused duplicate RPC calls.
    <WagmiProvider config={wagmiConfig} reconnectOnMount={false}>
      <RainbowKitStyles />
      <QueryClientProvider client={queryClient}>
        {/*
          FIX UX-2: ThemedRainbowKitProvider reads --accent dynamically via
          MutationObserver so the modal matches the user's active theme.
          Wallet stack intentionally remains RainbowKit.
          Do not swap to VFIDEWalletProvider until:
          1) authenticateWithProvider is wired to a real SDK
          2) ensureVaultExists is implemented against VaultHub
        */}
        <ThemedRainbowKitProvider>
          <SecurityProvider>
            <WalletAuthManager />
            <WalletPersistenceManager>{children}</WalletPersistenceManager>
          </SecurityProvider>
        </ThemedRainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
