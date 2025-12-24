"use client";

import '@rainbow-me/rainbowkit/styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { zkSyncSepoliaTestnet } from 'wagmi/chains';
import { config } from '@/lib/wagmi';

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider 
          initialChain={zkSyncSepoliaTestnet}
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
