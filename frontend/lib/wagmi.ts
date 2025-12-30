import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import { walletConnectWallet, metaMaskWallet } from '@rainbow-me/rainbowkit/wallets'
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
const noopStorage = {
  getItem: (_key: string) => null, // eslint-disable-line @typescript-eslint/no-unused-vars
  setItem: (_key: string, _value: string) => {}, // eslint-disable-line @typescript-eslint/no-unused-vars
  removeItem: (_key: string) => {}, // eslint-disable-line @typescript-eslint/no-unused-vars
}

// WalletConnect Project ID - required for WalletConnect v2
// Get your free project ID at https://cloud.walletconnect.com
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
if (!projectId) {
  console.error('[VFIDE] NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is required. Get one at https://cloud.walletconnect.com')
}

// Use empty string if not set - will show connection error to user
const safeProjectId = projectId || ''

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
      wallets: [
        walletConnectWallet,
      ],
    },
    {
      groupName: 'Others',
      wallets: [
        metaMaskWallet,
      ],
    },
  ],
  {
    appName,
    projectId: safeProjectId,
  }
)

// ========================================
// WAGMI CONFIG
// ========================================

const testnetConfig = createConfig({
  connectors,
  chains: testnetChains,
  transports: {
    [baseSepolia.id]: http(),
    [polygonAmoy.id]: http(),
    [zkSyncSepoliaTestnet.id]: http('https://sepolia.era.zksync.dev'),
  },
  ssr: true,
  storage: wagmiStorage,
  multiInjectedProviderDiscovery: false, // Disable auto-discovery to avoid duplicates
})

const mainnetConfig = createConfig({
  connectors,
  chains: mainnetChains,
  transports: {
    [base.id]: http(),
    [polygon.id]: http(),
    [zkSync.id]: http(),
  },
  ssr: true,
  storage: wagmiStorage,
  multiInjectedProviderDiscovery: false,
})

// Export the appropriate config based on environment
export const config = IS_TESTNET ? testnetConfig : mainnetConfig

declare module 'wagmi' {
  interface Register {
    config: typeof testnetConfig | typeof mainnetConfig
  }
}
