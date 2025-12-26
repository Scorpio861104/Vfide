/**
 * VFIDE Contract Addresses and ABIs
 */
import { isAddress } from 'viem'

// Zero address placeholder for missing contracts
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const

/**
 * H-5 Fix: Validate contract address at runtime
 * Returns properly typed address, or zero address if invalid/missing
 * Runtime validation logs warnings for debugging
 */
function validateContractAddress(address: string | undefined, name: string): `0x${string}` {
  if (!address) {
    if (typeof window !== 'undefined') {
      console.warn(`[VFIDE] Missing contract address: ${name}`)
    }
    return ZERO_ADDRESS
  }
  if (!isAddress(address)) {
    console.warn(`[VFIDE] Invalid contract address for ${name}: ${address}`)
    return ZERO_ADDRESS
  }
  return address as `0x${string}`
}

export const CONTRACT_ADDRESSES = {
  VFIDEToken: validateContractAddress(process.env.NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS, 'VFIDEToken'),
  VFIDEPresale: validateContractAddress(process.env.NEXT_PUBLIC_VFIDE_PRESALE_ADDRESS, 'VFIDEPresale'),
  StablecoinRegistry: validateContractAddress(process.env.NEXT_PUBLIC_STABLECOIN_REGISTRY_ADDRESS, 'StablecoinRegistry'),
  VFIDECommerce: validateContractAddress(process.env.NEXT_PUBLIC_VFIDE_COMMERCE_ADDRESS, 'VFIDECommerce'),
  MerchantPortal: validateContractAddress(process.env.NEXT_PUBLIC_MERCHANT_PORTAL_ADDRESS, 'MerchantPortal'),
  VaultHub: validateContractAddress(process.env.NEXT_PUBLIC_VAULT_HUB_ADDRESS, 'VaultHub'),
  Seer: validateContractAddress(process.env.NEXT_PUBLIC_SEER_ADDRESS, 'Seer'),
  DAO: validateContractAddress(process.env.NEXT_PUBLIC_DAO_ADDRESS, 'DAO'),
  DAOTimelock: validateContractAddress(process.env.NEXT_PUBLIC_DAO_TIMELOCK_ADDRESS, 'DAOTimelock'),
  TrustGateway: validateContractAddress(process.env.NEXT_PUBLIC_TRUST_GATEWAY_ADDRESS, 'TrustGateway'),
  BadgeNFT: validateContractAddress(process.env.NEXT_PUBLIC_BADGE_NFT_ADDRESS, 'BadgeNFT'),
  SecurityHub: validateContractAddress(process.env.NEXT_PUBLIC_SECURITY_HUB_ADDRESS, 'SecurityHub'),
  GuardianRegistry: validateContractAddress(process.env.NEXT_PUBLIC_GUARDIAN_REGISTRY_ADDRESS, 'GuardianRegistry'),
  GuardianLock: validateContractAddress(process.env.NEXT_PUBLIC_GUARDIAN_LOCK_ADDRESS, 'GuardianLock'),
  PanicGuard: validateContractAddress(process.env.NEXT_PUBLIC_PANIC_GUARD_ADDRESS, 'PanicGuard'),
  EmergencyBreaker: validateContractAddress(process.env.NEXT_PUBLIC_EMERGENCY_BREAKER_ADDRESS, 'EmergencyBreaker'),
} as const

// Minimal ABIs for common interactions
export const VFIDE_TOKEN_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
] as const

export const SEER_ABI = [
  'function getScore(address user) view returns (uint256)',
  'function endorseUser(address user)',
] as const

export const MERCHANT_PORTAL_ABI = [
  'function isMerchant(address) view returns (bool)',
  'function getMerchantInfo(address) view returns (tuple)',
  'function addMerchant(bytes32 metadata)',
] as const

export const VAULT_HUB_ABI = [
  'function vaultOf(address owner) view returns (address)',
  'function ownerOfVault(address vault) view returns (address)',
  'function ensureVault(address owner) returns (address)',
  'function predictVault(address owner) view returns (address)',
  'function isVault(address a) view returns (bool)',
  'function getVaultInfo(address vault) view returns (address owner, uint256 createdAt, bool isLocked, bool exists)',
  'function checkVaultStatus(address addr) view returns (bool hasVault, address vaultAddress, bool isVaultContract)',
  'function totalVaults() view returns (uint256)',
  'function vfideToken() view returns (address)',
] as const

export const BADGE_NFT_ABI = [
  'function mintBadge(bytes32 badge) returns (uint256)',
  'function mintBadges(bytes32[] badges) returns (uint256[])',
  'function burnBadge(uint256 tokenId)',
  'function getBadgesOfUser(address user) view returns (uint256[])',
  'function getBadgeDetails(uint256 tokenId) view returns (bytes32 badge, string name, string category, uint256 mintTime, uint256 number)',
  'function canMintBadge(address user, bytes32 badge) view returns (bool canMint, string reason)',
  'function getBadgeMintCount(bytes32 badge) view returns (uint256)',
  'function userBadgeToken(address user, bytes32 badge) view returns (uint256)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function balanceOf(address owner) view returns (uint256)',
] as const

// Presale ABI - 3-tier stablecoin-first presale
export const PRESALE_ABI = [
  // View functions
  'function TIER_0_PRICE() view returns (uint256)',
  'function TIER_1_PRICE() view returns (uint256)', 
  'function TIER_2_PRICE() view returns (uint256)',
  'function TIER_0_CAP() view returns (uint256)',
  'function TIER_1_CAP() view returns (uint256)',
  'function TIER_2_CAP() view returns (uint256)',
  'function tier0Sold() view returns (uint256)',
  'function tier1Sold() view returns (uint256)',
  'function tier2Sold() view returns (uint256)',
  'function tier0Enabled() view returns (bool)',
  'function tier1Enabled() view returns (bool)',
  'function tier2Enabled() view returns (bool)',
  'function getCurrentTier() view returns (uint8)',
  'function getTierPrice(uint8 tier) view returns (uint256)',
  'function getTierRemaining(uint8 tier) view returns (uint256)',
  'function getTierRequiredLock(uint8 tier) view returns (uint256)',
  'function purchases(address) view returns (uint256 totalTokens, uint256 lockedTokens, uint256 lockEnd, bool claimed)',
  'function presaleActive() view returns (bool)',
  'function startTime() view returns (uint256)',
  'function stablecoinRegistry() view returns (address)',
  // Buy functions
  'function buyWithStable(address stable, uint256 amount, uint8 tier, uint256 lockPeriod)',
  'function buyWithStableReferral(address stable, uint256 amount, uint8 tier, uint256 lockPeriod, address referrer)',
  'function buyWithETH(uint256 lockPeriod) payable',
  'function buyWithETHReferral(uint256 lockPeriod, address referrer) payable',
  // Claim function
  'function claim()',
] as const

// StablecoinRegistry ABI
export const STABLECOIN_REGISTRY_ABI = [
  'function isAllowed(address stable) view returns (bool)',
  'function isWhitelisted(address token) view returns (bool)',
  'function decimalsOf(address stable) view returns (uint8)',
  'function tokenDecimals(address token) view returns (uint8)',
  'function getAllStablecoins() view returns (address[], tuple(bool allowed, uint8 decimals, string symbol)[])',
  'function allowedCount() view returns (uint256)',
] as const
