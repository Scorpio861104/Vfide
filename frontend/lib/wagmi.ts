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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Required by Storage interface, unused in SSR context
  getItem: (_key: string) => null,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Required by Storage interface, unused in SSR context
  setItem: (_key: string, _value: string) => {},
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Required by Storage interface, unused in SSR context
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

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: hasWalletConnect ? [walletConnectWallet, coinbaseWallet] : [coinbaseWallet],
    },
    {
      groupName: 'Others',
      wallets: [metaMaskWallet],
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
