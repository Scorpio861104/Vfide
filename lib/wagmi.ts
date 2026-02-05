import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import { 
  walletConnectWallet, 
  metaMaskWallet,
  coinbaseWallet,
  injectedWallet,
  trustWallet,
  rainbowWallet,
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
import { isMobileDevice } from './mobileDetection'

// Create noopStorage for SSR to avoid hydration mismatches
// SSR-safe storage implementation - parameters required by Storage interface
const _noopStorage = {
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
// Support both naming conventions for backwards compatibility
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || process.env.NEXT_PUBLIC_WAGMI_PROJECT_ID
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
// CRITICAL: We use safeStorage directly because it already handles SSR internally
// by checking typeof window !== 'undefined' in each method call
const wagmiStorage = createStorage({
  storage: safeStorage,
  key: 'vfide-wallet', // Custom key prefix for our app
})

// ========================================
// WALLET CONNECTORS (MOBILE-FIRST)
// ========================================
// Mobile-first wallet configuration:
// - On mobile: prioritize WalletConnect and mobile app wallets
// - On desktop: prioritize browser extensions
// - Include explicit wallet options for best user experience

// Detect if running on mobile device (lazy evaluation, memoized)
const isMobile = isMobileDevice();

// Build wallet groups dynamically based on device type
// Mobile users get mobile wallets first, desktop users get extensions first
const walletGroups = isMobile ? [
  // MOBILE: WalletConnect and mobile apps first
  ...(hasWalletConnect ? [{
    groupName: 'Recommended for Mobile',
    wallets: [
      walletConnectWallet,  // Best for staying in browser
      trustWallet,          // Popular mobile wallet
      rainbowWallet,        // Modern mobile wallet
      coinbaseWallet,       // Cross-platform
    ],
  }] : [{
    groupName: 'Mobile Wallets',
    wallets: [
      trustWallet,
      rainbowWallet,
      coinbaseWallet,
    ],
  }]),
  {
    groupName: 'Browser Extensions',
    wallets: [
      metaMaskWallet,
      injectedWallet,
    ],
  },
] : [
  // DESKTOP: Browser extensions first
  {
    groupName: 'Browser Extensions',
    wallets: [
      metaMaskWallet,       // Most popular
      coinbaseWallet,       // Cross-platform
      injectedWallet,       // Catch-all for others (Rabby, Brave, etc.)
    ],
  },
  // Only add WalletConnect group if we have a valid project ID
  ...(hasWalletConnect ? [{
    groupName: 'Mobile & QR Code',
    wallets: [
      walletConnectWallet,  // For mobile app connections
      trustWallet,          // Has desktop app too
      rainbowWallet,        // Has desktop app too
    ],
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
