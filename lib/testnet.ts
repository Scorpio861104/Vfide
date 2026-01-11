/**
 * Network configuration utility
 * 
 * Network-agnostic: App works identically on all supported networks.
 * The actual network is determined by the user's wallet connection.
 * 
 * Supported networks:
 * - Base (8453) - Primary mainnet
 * - Base Sepolia (84532) - Testnet
 * - Polygon (137) - Mainnet
 * - Polygon Amoy (80002) - Testnet
 * - zkSync (324) - Mainnet
 * - zkSync Sepolia (300) - Testnet
 * 
 * The only difference between networks is which contract addresses are used.
 * All functionality works the same way regardless of network.
 */

// Note: This file is kept for reference and backwards compatibility
// The app no longer uses IS_TESTNET for UI decisions

// Chain IDs for reference
export const TESTNET_CHAIN_ID = 84532  // Base Sepolia
export const MAINNET_CHAIN_ID = 8453   // Base Mainnet

// Get current default chain ID from env (for initial connection suggestion)
export const CURRENT_CHAIN_ID = parseInt(
  process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID || '84532'
)

// Legacy export - kept for backwards compatibility
export const isTestnetChain = CURRENT_CHAIN_ID === TESTNET_CHAIN_ID

// Network display info (based on default chain from env)
export const NETWORK_INFO = {
  name: isTestnetChain ? 'Base Sepolia' : 'Base',
  shortName: 'Base',
  symbol: 'ETH',
}

// NOTE: Contract addresses are centralized in contracts.ts
// Import from '@/lib/contracts' for CONTRACT_ADDRESSES

// Faucet URLs (testnet only) - Base Sepolia uses ETH from various faucets
export const FAUCET_URLS = {
  // Official Coinbase faucet - best option!
  coinbase: 'https://portal.cdp.coinbase.com/products/faucet',
  // Alchemy faucet
  alchemy: 'https://www.alchemy.com/faucets/base-sepolia',
  // QuickNode
  quicknode: 'https://faucet.quicknode.com/base/sepolia',
}

// Explorer URLs (use getExplorerUrlForChainId from lib/chains for dynamic URLs)
export const EXPLORER_URL = isTestnetChain 
  ? 'https://sepolia.basescan.org'
  : 'https://basescan.org'

// Bridge URLs (for getting ETH to Base)
export const BRIDGE_URL = isTestnetChain
  ? 'https://sepolia-bridge.base.org'
  : 'https://bridge.base.org'

// Legacy alias for backwards compatibility
export const IS_TESTNET = isTestnetChain
