import { http, createConfig } from 'wagmi'
import { mainnet, polygon, arbitrum, sepolia, zkSyncSepoliaTestnet } from 'wagmi/chains'
import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import {
  metaMaskWallet,
  coinbaseWallet,
  walletConnectWallet,
  rainbowWallet,
  trustWallet,
  injectedWallet,
  phantomWallet,
  ledgerWallet,
  argentWallet,
  braveWallet,
  imTokenWallet,
  okxWallet,
  safeWallet,
  zerionWallet,
  rabbyWallet,
} from '@rainbow-me/rainbowkit/wallets'

// WalletConnect Project ID - required for WalletConnect v2
// Get your free project ID at https://cloud.walletconnect.com
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '3a8170812b534d0ff9d794f19a901d64'

const appInfo = {
  appName: 'VFIDE',
  projectId,
}

// Configure wallets - WalletConnect first for best cross-platform UX
// WalletConnect works universally (mobile stays in browser, desktop shows QR)
const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [
        walletConnectWallet,  // First - best UX for mobile (stays in browser)
        metaMaskWallet,       // Popular desktop choice
        coinbaseWallet,       // Good mobile UX
        rainbowWallet,
        rabbyWallet,
      ],
    },
    {
      groupName: 'More Wallets',
      wallets: [
        trustWallet,
        phantomWallet,
        argentWallet,
        okxWallet,
        zerionWallet,
        imTokenWallet,
        braveWallet,
        ledgerWallet,
        safeWallet,
        injectedWallet,
      ],
    },
  ],
  appInfo
)

// Custom zkSync Sepolia with explicit RPC and block explorer
// This helps wallets auto-add the network when switching
const zkSyncSepoliaWithMetadata = {
  ...zkSyncSepoliaTestnet,
  rpcUrls: {
    default: {
      http: ['https://sepolia.era.zksync.dev'],
      webSocket: ['wss://sepolia.era.zksync.dev/ws'],
    },
    public: {
      http: ['https://sepolia.era.zksync.dev'],
      webSocket: ['wss://sepolia.era.zksync.dev/ws'],
    },
  },
  blockExplorers: {
    default: {
      name: 'zkSync Sepolia Explorer',
      url: 'https://sepolia.explorer.zksync.io',
    },
  },
} as const

// zkSync Sepolia is first as it's the default testnet
export const config = createConfig({
  chains: [zkSyncSepoliaWithMetadata, mainnet, polygon, arbitrum, sepolia],
  connectors,
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
    [sepolia.id]: http(),
    [zkSyncSepoliaTestnet.id]: http('https://sepolia.era.zksync.dev'),
  },
  // Improve reconnection and network switching
  syncConnectedChain: true,
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
