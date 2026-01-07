'use client'

import '@rainbow-me/rainbowkit/styles.css'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { base, baseSepolia } from 'wagmi/chains'
import { IS_TESTNET } from '@/lib/chains'
import type { ReactNode } from 'react'

export function RainbowKitWrapper({ children }: { children: ReactNode }) {
  return (
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
  )
}
