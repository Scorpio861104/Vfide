"use client";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { config } from '@/lib/wagmi';
import { useState, type ReactNode } from 'react';
import { RainbowKitWrapper } from './RainbowKitWrapper';

/**
 * Web3 Provider with Enhanced Wallet Connection
 * 
 * Wraps the app with wagmi and RainbowKit for wallet connectivity.
 * Handles SSR correctly by using noopStorage during SSR phase.
 * 
 * CRITICAL: Do NOT conditionally render children based on mounted state.
 * This breaks wallet connection persistence and causes hydration issues.
 * The wagmi config handles SSR correctly with ssr:true + noopStorage.
 * 
 * Enhanced Features:
 * - Automatic reconnection on mount
 * - Optimized React Query settings for wallet state
 * - Proper SSR hydration handling
 */
export function Web3Provider({ children }: { children: ReactNode }) {
  // Create QueryClient inside component to avoid SSR hydration issues
  // Optimized settings for wallet connection state management
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Balance stale time with responsiveness: 2 minutes is good middle ground
        staleTime: 1000 * 60 * 2, // 2 minutes
        // Enable refetch on window focus for better wallet state sync
        refetchOnWindowFocus: true,
        // Retry failed queries for better reliability
        retry: 2,
        // Shorter retry delay for faster recovery
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
      },
    },
  }));

  return (
    <WagmiProvider config={config} reconnectOnMount={true}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitWrapper>{children}</RainbowKitWrapper>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
