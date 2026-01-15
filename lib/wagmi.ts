import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import { walletConnectWallet, metaMaskWallet, coinbaseWallet } from '@rainbow-me/rainbowkit/wallets'
import { createConfig, http, createStorage } from 'wagmi'
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

// WalletConnect Project ID with fallback for testing
// Fallback ensures wallet discovery works even without env var
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'vfide-fallback-for-local-testing'

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

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [walletConnectWallet, coinbaseWallet],
    },
    {
      groupName: 'Others',
      wallets: [metaMaskWallet],
    },
  ],
  {
    appName,
    projectId,
  }
)

// ========================================
// WAGMI CONFIG
// ========================================

const testnetConfig = createConfig({
  connectors,
  chains: testnetChains,
  transports: {
    [baseSepolia.id]: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || 'https://sepolia.base.org'),
    [polygonAmoy.id]: http(process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC || 'https://rpc-amoy.polygon.technology'),
    [zkSyncSepoliaTestnet.id]: http(process.env.NEXT_PUBLIC_ZKSYNC_SEPOLIA_RPC || 'https://sepolia.era.zksync.dev'),
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
    [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC || 'https://mainnet.base.org'),
    [polygon.id]: http(process.env.NEXT_PUBLIC_POLYGON_RPC || 'https://polygon-rpc.com'),
    [zkSync.id]: http(process.env.NEXT_PUBLIC_ZKSYNC_RPC || 'https://mainnet.era.zksync.io'),
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
