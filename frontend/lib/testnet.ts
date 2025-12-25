/**
 * Testnet configuration utility
 * 
 * Controls testnet-specific UI elements across the app.
 * When IS_TESTNET is false, all testnet banners, faucet links,
 * and onboarding flows are hidden.
 * 
 * To switch to mainnet, change in Vercel:
 *   NEXT_PUBLIC_IS_TESTNET=false
 *   NEXT_PUBLIC_DEFAULT_CHAIN_ID=324
 *   (update contract addresses)
 */

export const IS_TESTNET = process.env.NEXT_PUBLIC_IS_TESTNET !== 'false'

// Chain IDs
export const TESTNET_CHAIN_ID = 300  // zkSync Sepolia
export const MAINNET_CHAIN_ID = 324  // zkSync Era

// Get current chain ID from env
export const CURRENT_CHAIN_ID = parseInt(
  process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID || '300'
)

// Helper to check if we're on testnet based on chain
export const isTestnetChain = CURRENT_CHAIN_ID === TESTNET_CHAIN_ID

// Contract addresses - these change between testnet/mainnet
export const CONTRACT_ADDRESSES = {
  vfideToken: process.env.NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS || '',
  vaultHub: process.env.NEXT_PUBLIC_VAULTHUB_ADDRESS || '',
  presale: process.env.NEXT_PUBLIC_PRESALE_ADDRESS || '',
  seer: process.env.NEXT_PUBLIC_SEER_ADDRESS || '',
}

// Faucet URLs (testnet only)
export const FAUCET_URLS = {
  google: 'https://cloud.google.com/application/web3/faucet/ethereum/sepolia',
  quicknode: 'https://faucet.quicknode.com/ethereum/sepolia',
  alchemy: 'https://www.alchemy.com/faucets/ethereum-sepolia',
}

// Explorer URLs
export const EXPLORER_URL = IS_TESTNET 
  ? 'https://sepolia.explorer.zksync.io'
  : 'https://explorer.zksync.io'
