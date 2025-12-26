import { http, createConfig } from 'wagmi'
import { 
  base, 
  baseSepolia, 
  polygon, 
  polygonAmoy,
  zkSync,
  zkSyncSepoliaTestnet,
  mainnet,
  sepolia,
} from 'wagmi/chains'
import { connectorsForWallets, getDefaultWallets } from '@rainbow-me/rainbowkit'
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
import { IS_TESTNET } from './chains'

// WalletConnect Project ID - required for WalletConnect v2
// Get your free project ID at https://cloud.walletconnect.com
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
if (!projectId) {
  console.error('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is required. Get one at https://cloud.walletconnect.com')
}

const appInfo = {
  appName: 'VFIDE',
  projectId: projectId || '',
}

// Configure wallets - Coinbase Smart Wallet first for easiest UX
// Coinbase Smart Wallet can be created with just an email!
const connectors = connectorsForWallets(
  [
    {
      groupName: '🌟 Easiest - No Wallet Needed',
      wallets: [
        // Coinbase Smart Wallet - can sign up with just email
        coinbaseWallet,
      ],
    },
    {
      groupName: 'Connect Existing Wallet',
      wallets: [
        walletConnectWallet,  // Best for mobile (stays in browser)
        metaMaskWallet,       // Popular desktop choice
        rainbowWallet,
        rabbyWallet,
        trustWallet,
      ],
    },
    {
      groupName: 'More Wallets',
      wallets: [
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

// ========================================
// MULTI-CHAIN CONFIGURATION
// ========================================
// We support Base, Polygon, and zkSync
// Base is first because Coinbase users already have it!

// Testnet chains (in order of user-friendliness)
const testnetChains = [
  baseSepolia,         // Coinbase users ready!
  polygonAmoy,         // Many wallets have it
  zkSyncSepoliaWithMetadata, // Needs network add
] as const

// Mainnet chains (same order)
const mainnetChains = [
  base,
  polygon,
  zkSync,
] as const

// Create testnet config
const testnetConfig = createConfig({
  chains: testnetChains,
  connectors,
  transports: {
    [baseSepolia.id]: http(),
    [polygonAmoy.id]: http(),
    [zkSyncSepoliaTestnet.id]: http('https://sepolia.era.zksync.dev'),
  },
  syncConnectedChain: true,
})

// Create mainnet config
const mainnetConfig = createConfig({
  chains: mainnetChains,
  connectors,
  transports: {
    [base.id]: http(),
    [polygon.id]: http(),
    [zkSync.id]: http(),
  },
  syncConnectedChain: true,
})

// Export the appropriate config based on environment
export const config = IS_TESTNET ? testnetConfig : mainnetConfig

declare module 'wagmi' {
  interface Register {
    config: typeof testnetConfig | typeof mainnetConfig
  }
}
