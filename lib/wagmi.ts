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

// Enhanced storage with error handling for wallet persistence
const safeStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      // localStorage might be blocked (incognito, security settings)
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Silently fail if storage is full or blocked
    }
  },
  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Silently fail
    }
  },
};

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

// Create storage that works with SSR and handles errors gracefully
const wagmiStorage = createStorage({
  storage: typeof window !== 'undefined' ? safeStorage : noopStorage,
  key: 'vfide-wallet', // Custom key prefix for our app
})

// ========================================
// WALLET CONNECTORS
// ========================================
// Include explicit wallet options for best user experience
// metaMaskWallet: Shows MetaMask with install prompt if not installed
// injectedWallet: Detects other browser extensions (Rabby, Brave, etc.)
// coinbaseWallet: Direct Coinbase SDK connection
// walletConnectWallet: Mobile/QR code connections (requires project ID)

// Build wallet groups dynamically - only include groups that have wallets
// This prevents the "No wallets provided for group" error during SSR
const walletGroups = [
  {
    groupName: 'Popular',
    wallets: [
      // MetaMask first - shows install prompt if not installed
      metaMaskWallet,
      // Coinbase Wallet direct SDK
      coinbaseWallet,
      // Catch other browser extensions (Rabby, Brave Wallet, etc.)
      injectedWallet,
    ],
  },
  // Only add WalletConnect group if we have a valid project ID
  // Spreading empty array when no projectId avoids empty group error
  ...(hasWalletConnect ? [{
    groupName: 'Mobile & QR',
    wallets: [walletConnectWallet],
  }] : []),
]

const connectors = connectorsForWallets(
  walletGroups,
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
