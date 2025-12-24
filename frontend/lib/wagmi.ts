import { http, createConfig } from 'wagmi'
import { mainnet, polygon, arbitrum, sepolia, zkSyncSepoliaTestnet } from 'wagmi/chains'
import { getDefaultWallets, connectorsForWallets } from '@rainbow-me/rainbowkit'
import {
  metaMaskWallet,
  coinbaseWallet,
  walletConnectWallet,
  rainbowWallet,
  trustWallet,
  injectedWallet,
} from '@rainbow-me/rainbowkit/wallets'

// WalletConnect Project ID - required for WalletConnect v2
// Get your free project ID at https://cloud.walletconnect.com
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '3a8170812b534d0ff9d794f19a901d64'

const appInfo = {
  appName: 'VFIDE',
  projectId,
}

// Configure wallets with proper grouping
const connectors = connectorsForWallets(
  [
    {
      groupName: 'Popular',
      wallets: [
        metaMaskWallet,
        coinbaseWallet,
        walletConnectWallet,
        rainbowWallet,
      ],
    },
    {
      groupName: 'More',
      wallets: [
        trustWallet,
        injectedWallet,
      ],
    },
  ],
  appInfo
)

// zkSync Sepolia is first as it's the default testnet
export const config = createConfig({
  chains: [zkSyncSepoliaTestnet, mainnet, polygon, arbitrum, sepolia],
  connectors,
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
    [sepolia.id]: http(),
    [zkSyncSepoliaTestnet.id]: http('https://sepolia.era.zksync.dev'),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
