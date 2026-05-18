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
import { CONTRACT_ADDRESSES, isConfiguredContractAddress } from '@/lib/contracts'

function configuredContractOrEmpty(address: string): string {
  return isConfiguredContractAddress(address) ? address : ''
}

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
        seer: '',
      },
      testnet: {
        // Deployed on Base Sepolia - Dec 25, 2025
        vfideToken: configuredContractOrEmpty(CONTRACT_ADDRESSES.VFIDEToken),
        vaultHub: configuredContractOrEmpty(CONTRACT_ADDRESSES.VaultHub),
        seer: configuredContractOrEmpty(CONTRACT_ADDRESSES.Seer),
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
        vfideToken: process.env.NEXT_PUBLIC_POLYGON_VFIDE_TOKEN_ADDRESS || '', // Deploy pending
        vaultHub: process.env.NEXT_PUBLIC_POLYGON_VAULT_HUB_ADDRESS || '',
        seer: process.env.NEXT_PUBLIC_POLYGON_SEER_ADDRESS || '',
      },
      testnet: {
        vfideToken: process.env.NEXT_PUBLIC_POLYGON_AMOY_VFIDE_TOKEN_ADDRESS || '', // Deploy pending
        vaultHub: process.env.NEXT_PUBLIC_POLYGON_AMOY_VAULT_HUB_ADDRESS || '',
        seer: process.env.NEXT_PUBLIC_POLYGON_AMOY_SEER_ADDRESS || '',
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
        seer: '',
      },
      testnet: {
        // Already deployed!
        vfideToken: '0x3249215721a21BC9635C01Ea05AdE032dd90961f',
        vaultHub: '0xe34dF8582fccC39CdE15e9a1aae73cd3890744Cc',
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
 * Find chain config by chain ID (works for both mainnet and testnet)
 */
export function getChainByChainId(chainId: number): ChainConfig | undefined {
  return Object.values(CHAINS).find(config => {
    return config.mainnet.id === chainId || config.testnet.id === chainId
  })
}

/**
 * Get supported chain from chain ID
 */
export function getSupportedChainFromId(chainId: number): SupportedChain | undefined {
  const config = getChainByChainId(chainId)
  return config?.id
}

/**
 * Check if a chain ID is a testnet
 */
export function isTestnetChainId(chainId: number): boolean {
  const config = getChainByChainId(chainId)
  return config ? config.testnet.id === chainId : false
}

/**
 * Get explorer URL for specific chain ID
 */
export function getExplorerUrlForChainId(chainId: number): string {
  const config = getChainByChainId(chainId)
  if (!config) return 'https://basescan.org'
  
  const isTestnet = config.testnet.id === chainId
  const network = isTestnet ? config.testnet : config.mainnet
  return network.blockExplorers?.default?.url || 'https://basescan.org'
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
