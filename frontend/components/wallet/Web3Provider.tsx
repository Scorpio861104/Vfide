"use client";

import '@rainbow-me/rainbowkit/styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { base, baseSepolia } from 'wagmi/chains';
import { config } from '@/lib/wagmi';
import { IS_TESTNET } from '@/lib/chains';
import { useState, type ReactNode } from 'react';

/**
 * Web3 Provider with Wallet Connection
 * 
 * Wraps the app with wagmi and RainbowKit for wallet connectivity.
 * Handles SSR correctly by using noopStorage during SSR phase.
 * 
 * CRITICAL: Do NOT conditionally render children based on mounted state.
 * This breaks wallet connection persistence and causes hydration issues.
 * The wagmi config handles SSR correctly with ssr:true + noopStorage.
 */
export function Web3Provider({ children }: { children: ReactNode }) {
  // Create QueryClient inside component to avoid SSR hydration issues
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <WagmiProvider config={config} reconnectOnMount={true}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider 
          initialChain={IS_TESTNET ? baseSepolia : base}
          modalSize="compact"
          theme={darkTheme({
            accentColor: '#00F0FF',
            accentColorForeground: '#1A1A1D',
            borderRadius: 'medium',
            fontStack: 'system',
            overlayBlur: 'small',
          })}
          appInfo={{
            appName: 'VFIDE',
            learnMoreUrl: 'https://vfide.io/docs',
            disclaimer: ({ Text, Link }) => (
              <Text>
                On mobile? Use WalletConnect to stay in your browser.{' '}
                <Link href="https://vfide.io/docs">Learn more</Link>
              </Text>
            ),
          }}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
