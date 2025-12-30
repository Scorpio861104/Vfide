/**
 * Testnet configuration utility
 * 
 * Controls testnet-specific UI elements across the app.
 * When IS_TESTNET is false, all testnet banners, faucet links,
 * and onboarding flows are hidden.
 * 
 * PRIMARY CHAIN: Base (Coinbase ecosystem)
 * 
 * To switch to mainnet, change in Vercel:
 *   NEXT_PUBLIC_IS_TESTNET=false
 *   NEXT_PUBLIC_DEFAULT_CHAIN_ID=8453
 *   (update contract addresses)
 */

export const IS_TESTNET = process.env.NEXT_PUBLIC_IS_TESTNET !== 'false'

// Chain IDs - Base is our primary chain!
export const TESTNET_CHAIN_ID = 84532  // Base Sepolia
export const MAINNET_CHAIN_ID = 8453   // Base Mainnet

// Get current chain ID from env
export const CURRENT_CHAIN_ID = parseInt(
  process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID || '84532'
)

// Helper to check if we're on testnet based on chain
export const isTestnetChain = CURRENT_CHAIN_ID === TESTNET_CHAIN_ID

// Network display info
export const NETWORK_INFO = {
  name: IS_TESTNET ? 'Base Sepolia' : 'Base',
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

// Explorer URLs
export const EXPLORER_URL = IS_TESTNET 
  ? 'https://sepolia.basescan.org'
  : 'https://basescan.org'

// Bridge URLs (for getting ETH to Base)
export const BRIDGE_URL = IS_TESTNET
  ? 'https://sepolia-bridge.base.org'
  : 'https://bridge.base.org'
