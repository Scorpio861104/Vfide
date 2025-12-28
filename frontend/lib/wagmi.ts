import { http, createConfig, createStorage } from 'wagmi'
import { 
  base, 
  baseSepolia, 
  polygon, 
  polygonAmoy,
  zkSync,
  zkSyncSepoliaTestnet,
} from 'wagmi/chains'
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
import { IS_TESTNET } from './chains'

// Create noopStorage for SSR to avoid hydration mismatches
const noopStorage = {
  getItem: (_key: string) => null,
  setItem: (_key: string, _value: string) => {},
  removeItem: (_key: string) => {},
}

// WalletConnect Project ID - required for WalletConnect v2
// Get your free project ID at https://cloud.walletconnect.com
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '21fef48091f12692cad574a6f7753643'
if (!process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID) {
  console.warn('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID not set, using fallback. Get one at https://cloud.walletconnect.com')
}

// Wallet configuration for RainbowKit v2
// MetaMask and injected wallets first (no WalletConnect needed)
const walletList = [
  {
    groupName: '🔌 Browser Wallets',
    wallets: [
      injectedWallet,       // Works with any injected wallet
      metaMaskWallet,       // Most popular - no WalletConnect needed
      coinbaseWallet,       // Coinbase Smart Wallet
      rabbyWallet,
      braveWallet,
    ],
  },
  {
    groupName: '📱 Mobile & Other',
    wallets: [
      walletConnectWallet,  // For mobile wallets
      rainbowWallet,
      trustWallet,
      phantomWallet,
      argentWallet,
      okxWallet,
      zerionWallet,
      imTokenWallet,
      ledgerWallet,
      safeWallet,
    ],
  },
]

const walletConnectOptions = {
  appName: 'VFIDE',
  projectId: projectId,
  // Additional metadata for WalletConnect
  appDescription: 'Decentralized Payment Protocol',
  appUrl: typeof window !== 'undefined' ? window.location.origin : 'https://vfide.io',
  appIcon: 'https://vfide.io/icon.png',
}

// Create separate connectors for each config (wagmi v2 requirement)
const testnetConnectors = connectorsForWallets(walletList, walletConnectOptions)
const mainnetConnectors = connectorsForWallets(walletList, walletConnectOptions)

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

// Create storage that works with SSR
// Uses noopStorage during SSR, localStorage on client
const wagmiStorage = createStorage({
  storage: typeof window !== 'undefined' ? window.localStorage : noopStorage,
})

// Create testnet config
const testnetConfig = createConfig({
  chains: testnetChains,
  connectors: testnetConnectors,
  transports: {
    [baseSepolia.id]: http(),
    [polygonAmoy.id]: http(),
    [zkSyncSepoliaTestnet.id]: http('https://sepolia.era.zksync.dev'),
  },
  storage: wagmiStorage,
  ssr: true, // Enable SSR support for Next.js
  syncConnectedChain: true,
})

// Create mainnet config
const mainnetConfig = createConfig({
  chains: mainnetChains,
  connectors: mainnetConnectors,
  transports: {
    [base.id]: http(),
    [polygon.id]: http(),
    [zkSync.id]: http(),
  },
  storage: wagmiStorage,
  ssr: true, // Enable SSR support for Next.js
  syncConnectedChain: true,
})

// Export the appropriate config based on environment
export const config = IS_TESTNET ? testnetConfig : mainnetConfig

declare module 'wagmi' {
  interface Register {
    config: typeof testnetConfig | typeof mainnetConfig
  }
}
