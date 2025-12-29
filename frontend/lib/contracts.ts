/**
 * VFIDE Contract Addresses and ABIs
 * 
 * REFACTORED: Now imports ABIs from JSON artifacts to ensure consistency.
 * Legacy constant names (e.g. VFIDE_TOKEN_ABI) are preserved as aliases.
 */
import { isAddress } from 'viem'
import {
  VFIDETokenABI,
  VFIDEPresaleABI,
  StablecoinRegistryABI,
  VaultInfrastructureABI,
  SeerABI,
  VFIDEBadgeNFTABI,
  DAOABI,
  DAOTimelockABI,
  SecurityHubABI,
  GuardianRegistryABI,
  GuardianLockABI,
  PanicGuardABI,
  EmergencyBreakerABI,
  MerchantRegistryABI,
  MerchantPortalABI,
  ProofScoreBurnRouterABI,
  ProofLedgerABI,
  CommerceEscrowABI
} from './abis'

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

// ==============================================================================
// ABI EXPORTS
// Aliased to match legacy usage while using the full JSON source of truth.
// ==============================================================================

export const VFIDE_TOKEN_ABI = VFIDETokenABI
export const SEER_ABI = SeerABI
export const MERCHANT_PORTAL_ABI = MerchantPortalABI
export const VAULT_HUB_ABI = VaultInfrastructureABI
export const BADGE_NFT_ABI = VFIDEBadgeNFTABI
export const PRESALE_ABI = VFIDEPresaleABI
export const STABLECOIN_REGISTRY_ABI = StablecoinRegistryABI

// Export all other ABIs directly
export {
  VFIDETokenABI,
  VFIDEPresaleABI,
  StablecoinRegistryABI,
  VaultInfrastructureABI,
  SeerABI,
  VFIDEBadgeNFTABI,
  DAOABI,
  DAOTimelockABI,
  SecurityHubABI,
  GuardianRegistryABI,
  GuardianLockABI,
  PanicGuardABI,
  EmergencyBreakerABI,
  MerchantRegistryABI,
  MerchantPortalABI,
  ProofScoreBurnRouterABI,
  ProofLedgerABI,
  CommerceEscrowABI
}
