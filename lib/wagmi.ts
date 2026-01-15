import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import { 
  walletConnectWallet, 
  metaMaskWallet, 
  coinbaseWallet,
  injectedWallet,
} from '@rainbow-me/rainbowkit/wallets'
import { createConfig, http, fallback, createStorage } from 'wagmi'
import { 
  base, 
  baseSepolia, 
  polygon, 
  polygonAmoy,
  zkSync,
  zkSyncSepoliaTestnet,
} from 'wagmi/chains'
import { IS_TESTNET } from './chains'

// Create noopStorage for SSR to avoid hydration mismatches
// SSR-safe storage implementation - parameters required by Storage interface
const noopStorage = {
   
  getItem: (_key: string) => null,
   
  setItem: (_key: string, _value: string) => {},
   
  removeItem: (_key: string) => {},
}

// WalletConnect Project ID (optional for local/dev/test runs).
// When missing, we fully disable the WalletConnect connector to keep env-less
// builds/tests deterministic and avoid remote registry/config fetches.
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
const hasWalletConnect = typeof projectId === 'string' && projectId.length > 0

// App metadata for wallet connections
const appName = 'VFIDE'

// Custom zkSync Sepolia with explicit RPC
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
// CHAIN CONFIGURATION
// ========================================

// Testnet chains
const testnetChains = [
  baseSepolia,
  polygonAmoy,
  zkSyncSepoliaWithMetadata,
] as const

// Mainnet chains
const mainnetChains = [
  base,
  polygon,
  zkSync,
] as const

// Create storage that works with SSR
const wagmiStorage = createStorage({
  storage: typeof window !== 'undefined' ? window.localStorage : noopStorage,
})

// ========================================
// WALLET CONNECTORS
// ========================================
// Prioritize MetaMask and browser wallets for best user experience
// MetaMask is the most popular wallet and should be shown first
// Note: injectedWallet is configured to exclude MetaMask to avoid duplication

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Popular',
      wallets: [
        // MetaMask first for best compatibility and user familiarity
        metaMaskWallet,
        // Injected wallet catches other browser wallets (Brave, Trust Wallet, etc.)
        // Note: This won't duplicate MetaMask as RainbowKit handles deduplication
        injectedWallet,
        // Coinbase Wallet is also widely used
        coinbaseWallet,
      ],
    },
    {
      groupName: 'Other Wallets',
      // Only include WalletConnect if we have a valid project ID
      wallets: hasWalletConnect ? [walletConnectWallet] : [],
    },
  ],
  {
    appName,
    // RainbowKit expects a string here; it is only used when the WalletConnect
    // wallet is present.
    projectId: projectId || '00000000000000000000000000000000',
  }
)

// ========================================
// WAGMI CONFIG WITH RPC FALLBACKS
// ========================================
// Multiple RPC endpoints for reliability - automatically fails over if primary is down

const testnetConfig = createConfig({
  connectors,
  chains: testnetChains,
  transports: {
    // Base Sepolia with fallback RPCs
    [baseSepolia.id]: fallback([
      http('https://sepolia.base.org'),
      http('https://base-sepolia.blockpi.network/v1/rpc/public'),
      http(),
    ]),
    // Polygon Amoy with fallback RPCs
    [polygonAmoy.id]: fallback([
      http('https://rpc-amoy.polygon.technology'),
      http('https://polygon-amoy.blockpi.network/v1/rpc/public'),
      http(),
    ]),
    // zkSync Sepolia with fallback RPCs
    [zkSyncSepoliaTestnet.id]: fallback([
      http('https://sepolia.era.zksync.dev'),
      http('https://zksync-sepolia.blockpi.network/v1/rpc/public'),
    ]),
  },
  ssr: true,
  storage: wagmiStorage,
  // Enable EIP-6963 wallet discovery - required for MetaMask and other modern wallets
  multiInjectedProviderDiscovery: true,
})

const mainnetConfig = createConfig({
  connectors,
  chains: mainnetChains,
  transports: {
    // Base with fallback RPCs
    [base.id]: fallback([
      http('https://mainnet.base.org'),
      http('https://base.blockpi.network/v1/rpc/public'),
      http('https://base.llamarpc.com'),
      http(),
    ]),
    // Polygon with fallback RPCs
    [polygon.id]: fallback([
      http('https://polygon-rpc.com'),
      http('https://polygon.llamarpc.com'),
      http('https://polygon.blockpi.network/v1/rpc/public'),
      http(),
    ]),
    // zkSync with fallback RPCs
    [zkSync.id]: fallback([
      http('https://mainnet.era.zksync.io'),
      http('https://zksync.blockpi.network/v1/rpc/public'),
      http('https://zksync.meowrpc.com'),
    ]),
  },
  ssr: true,
  storage: wagmiStorage,
  // Enable EIP-6963 wallet discovery - required for MetaMask and other modern wallets
  multiInjectedProviderDiscovery: true,
})

// Export the appropriate config based on environment
export const config = IS_TESTNET ? testnetConfig : mainnetConfig

declare module 'wagmi' {
  interface Register {
    config: typeof testnetConfig | typeof mainnetConfig
  }
}
