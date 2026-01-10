/**
 * Multi-Chain Configuration
 * 
 * VFIDE supports multiple chains for user convenience:
 * - Base: Coinbase users already have it (no network add needed!)
 * - Polygon: Largest L2 user base
 * - zkSync: Lowest fees for power users
 * 
 * Users can pick their preferred chain. Contracts are deployed identically on all chains.
 */

import { 
  base, 
  baseSepolia, 
  polygon, 
  polygonAmoy,
  zkSync,
  zkSyncSepoliaTestnet 
} from 'wagmi/chains'

import type { Chain } from 'viem'

// ========================================
// CHAIN DEFINITIONS
// ========================================

export type SupportedChain = 'base' | 'polygon' | 'zksync'

export interface ChainConfig {
  id: SupportedChain
  name: string
  icon: string
  description: string
  tagline: string
  mainnet: Chain
  testnet: Chain
  contracts: {
    mainnet: ChainContracts
    testnet: ChainContracts
  }
  faucetUrl?: string
  bridgeUrl: string
  color: string
}

export interface ChainContracts {
  vfideToken: string
  vaultHub: string
  presale: string
  seer: string
}

// ========================================
// CHAIN CONFIGURATIONS
// ========================================

export const CHAINS: Record<SupportedChain, ChainConfig> = {
  base: {
    id: 'base',
    name: 'Base',
    icon: '🔵',
    description: 'Coinbase\'s L2 - if you have Coinbase Wallet, you\'re ready!',
    tagline: 'Easiest for Coinbase users',
    mainnet: base,
    testnet: baseSepolia,
    contracts: {
      mainnet: {
        vfideToken: '', // Deploy pending
        vaultHub: '',
        presale: '',
        seer: '',
      },
      testnet: {
        // Deployed on Base Sepolia - Dec 25, 2025
        vfideToken: process.env.NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS || '',
        vaultHub: process.env.NEXT_PUBLIC_VAULT_HUB_ADDRESS || '',
        presale: process.env.NEXT_PUBLIC_VFIDE_PRESALE_ADDRESS || '',
        seer: process.env.NEXT_PUBLIC_SEER_ADDRESS || '',
      },
    },
    faucetUrl: 'https://portal.cdp.coinbase.com/products/faucet',
    bridgeUrl: 'https://bridge.base.org',
    color: '#0052FF',
  },
  
  polygon: {
    id: 'polygon',
    name: 'Polygon',
    icon: '💜',
    description: 'Most popular L2 - 50M+ wallets already connected',
    tagline: 'Most wallets ready',
    mainnet: polygon,
    testnet: polygonAmoy,
    contracts: {
      mainnet: {
        vfideToken: '', // Deploy pending
        vaultHub: '',
        presale: '',
        seer: '',
      },
      testnet: {
        vfideToken: '', // Deploy pending
        vaultHub: '',
        presale: '',
        seer: '',
      },
    },
    faucetUrl: 'https://faucet.polygon.technology/',
    bridgeUrl: 'https://portal.polygon.technology/bridge',
    color: '#8247E5',
  },
  
  zksync: {
    id: 'zksync',
    name: 'zkSync',
    icon: '⚡',
    description: 'Lowest fees with zero-knowledge proofs',
    tagline: 'Cheapest transactions',
    mainnet: zkSync,
    testnet: zkSyncSepoliaTestnet,
    contracts: {
      mainnet: {
        vfideToken: '', // Deploy pending
        vaultHub: '',
        presale: '',
        seer: '',
      },
      testnet: {
        // Already deployed!
        vfideToken: '0x3249215721a21BC9635C01Ea05AdE032dd90961f',
        vaultHub: '0xe34dF8582fccC39CdE15e9a1aae73cd3890744Cc',
        presale: '0x338926cd13aAA99da8e846732e8010b16d1369ea',
        seer: '0xD22944d47bAD4Bd5fF1A366393c4bdbc9250fd8E',
      },
    },
    faucetUrl: 'https://cloud.google.com/application/web3/faucet/ethereum/sepolia',
    bridgeUrl: 'https://portal.zksync.io/bridge',
    color: '#8C8DFC',
  },
}

// ========================================
// ENVIRONMENT CONFIGURATION
// ========================================

export const IS_TESTNET = process.env.NEXT_PUBLIC_IS_TESTNET !== 'false'

// Default chain - can be overridden by user preference
export const DEFAULT_CHAIN: SupportedChain = 
  (process.env.NEXT_PUBLIC_DEFAULT_CHAIN as SupportedChain) || 'base'

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Get the current network config for a chain
 */
export function getChainNetwork(chain: SupportedChain) {
  const config = CHAINS[chain]
  return IS_TESTNET ? config.testnet : config.mainnet
}

/**
 * Get contracts for a chain
 */
export function getChainContracts(chain: SupportedChain): ChainContracts {
  const config = CHAINS[chain]
  return IS_TESTNET ? config.contracts.testnet : config.contracts.mainnet
}

/**
 * Get explorer URL for a chain
 */
export function getExplorerUrl(chain: SupportedChain): string {
  const network = getChainNetwork(chain)
  return network.blockExplorers?.default?.url || ''
}

/**
 * Get chain ID for current network
 */
export function getChainId(chain: SupportedChain): number {
  return getChainNetwork(chain).id
}

/**
 * Get all supported chain IDs for current network mode
 */
export function getAllChainIds(): number[] {
  return Object.keys(CHAINS).map(key => getChainId(key as SupportedChain))
}

/**
 * Find chain config by chain ID
 */
export function getChainByChainId(chainId: number): ChainConfig | undefined {
  return Object.values(CHAINS).find(config => {
    const network = IS_TESTNET ? config.testnet : config.mainnet
    return network.id === chainId
  })
}

/**
 * Check if a chain ID is supported
 */
export function isSupportedChainId(chainId: number): boolean {
  return getAllChainIds().includes(chainId)
}

/**
 * Check if contracts are deployed on a chain
 */
export function isChainReady(chain: SupportedChain): boolean {
  const contracts = getChainContracts(chain)
  return Boolean(contracts.vfideToken && contracts.vaultHub)
}

/**
 * Get all chains that are ready (have contracts deployed)
 */
export function getReadyChains(): SupportedChain[] {
  return (Object.keys(CHAINS) as SupportedChain[]).filter(isChainReady)
}

/**
 * User-friendly chain list sorted by ease of use
 */
export function getChainList() {
  return [
    CHAINS.base,    // Easiest - Coinbase users ready
    CHAINS.polygon, // Most users ready
    CHAINS.zksync,  // Cheapest but needs setup
  ]
}

// ========================================
// WAGMI CHAIN ARRAY
// ========================================

/**
 * Get wagmi chains array for current network mode
 */
export function getWagmiChains() {
  if (IS_TESTNET) {
    return [baseSepolia, polygonAmoy, zkSyncSepoliaTestnet] as const
  }
  return [base, polygon, zkSync] as const
}
