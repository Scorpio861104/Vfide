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
// 
// IMPORTANT: For production use, you MUST set a valid WalletConnect Project ID.
// Without it, wallet connections (especially MetaMask) may not work properly.
// Get your free project ID at: https://cloud.walletconnect.com/
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
const hasWalletConnect = typeof projectId === 'string' && projectId.length > 0

// Warn developers if using a dummy project ID
if (!hasWalletConnect && typeof window !== 'undefined') {
  console.warn(
    '[VFIDE Wallet Config] No WalletConnect Project ID detected.\n' +
    'Wallet connections may not work properly, especially for MetaMask and mobile wallets.\n' +
    'Get a free Project ID at: https://cloud.walletconnect.com/\n' +
    'Then set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in your .env file.'
  )
}

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
// Wallet order matters - RainbowKit uses EIP-6963 for wallet discovery.
// metaMaskWallet: Explicitly connects to MetaMask extension
// coinbaseWallet: Direct Coinbase SDK connection
// walletConnectWallet: Mobile/QR code connections (requires project ID)
//
// NOTE: Do NOT include injectedWallet alongside metaMaskWallet - it causes
// a conflict where injectedWallet claims MetaMask first, making the
// metaMaskWallet button appear as a dead/duplicate button.

// Build wallet groups dynamically - only include groups with wallets
const walletGroups = [
  {
    groupName: 'Popular',
    wallets: [
      // MetaMask - most popular browser extension wallet
      metaMaskWallet,
      // Coinbase Wallet - second most popular
      coinbaseWallet,
      // Injected wallet as fallback for other extensions (Rabby, Brave, etc.)
      // This will only show if there are OTHER injected wallets besides MetaMask
      injectedWallet,
    ],
  },
  // Only add WalletConnect group if we have a valid project ID
  ...(hasWalletConnect ? [{
    groupName: 'Mobile & QR',
    wallets: [walletConnectWallet],
  }] : []),
]

const connectors = connectorsForWallets(
  walletGroups,
  {
    appName,
    // IMPORTANT: Using a dummy project ID as fallback for development/testing.
    // For production, ensure NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is set with a valid
    // project ID from https://cloud.walletconnect.com/
    // Without a valid project ID, MetaMask and other wallets may not work correctly.
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
