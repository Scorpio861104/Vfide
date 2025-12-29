import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { walletConnectWallet } from '@rainbow-me/rainbowkit/wallets'
import { createStorage } from 'wagmi'
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
// WAGMI CONFIG
// ========================================

export const config = getDefaultConfig({
  appName,
  projectId,
  chains: IS_TESTNET ? testnetChains : mainnetChains,
  wallets: [{
    groupName: 'Recommended',
    wallets: [walletConnectWallet],
  }],
  ssr: true,
  storage: wagmiStorage,
})


declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
