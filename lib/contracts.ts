/**
 * VFIDE Contract Addresses and ABIs
 * 
 * REFACTORED: Now imports ABIs from JSON artifacts to ensure consistency.
 * Legacy constant names (e.g. VFIDE_TOKEN_ABI) are preserved as aliases.
 */
import { isAddress } from 'viem'
import {
  VFIDETokenABI,
  StablecoinRegistryABI,
  VaultInfrastructureABI,
  VaultHubABI,
  UserVaultABI,
  CardBoundVaultABI,
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
  CommerceEscrowABI,
  VaultHubLiteABI,
  UserVaultLiteABI,
  BurnRouterABI,
  DutyDistributorABI,
  CouncilElectionABI,
  CouncilSalaryABI,
  SubscriptionManagerABI,
  SanctumVaultABI,
  DevReserveVestingABI,
  PayrollManagerABI,
  EcosystemVaultABI,
  VaultRegistryABI,
  ERC20ABI,
  SeerSocialABI,
  SeerViewABI,
  UserRewardsABI,
  PromotionalTreasuryABI,
} from './abis'
import { logger } from '@/lib/logger';

// Zero address placeholder for missing contracts
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const

/**
 * Validate contract address at runtime
 * Returns properly typed address, or zero address if invalid/missing
 * Runtime validation logs warnings for debugging
 */
function validateContractAddress(address: string | undefined, name: string): `0x${string}` {
  if (!address) {
    // Convert camelCase name to SCREAMING_SNAKE_CASE for env var name
    // Examples: vfideToken -> VFIDE_TOKEN, StablecoinRegistry -> STABLECOIN_REGISTRY
    const envVarName = `NEXT_PUBLIC_${name.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase()}_ADDRESS`;
    if (process.env.NODE_ENV === 'production') {
      logger.error(`[VFIDE] Missing contract address in production: ${name}. Set ${envVarName} in environment. All calls to this contract will fail.`)
    } else {
      logger.warn(`[VFIDE] Missing contract address: ${name}. Using ZERO_ADDRESS. Set ${envVarName} in environment.`)
    }
    return ZERO_ADDRESS
  }
  if (!isAddress(address)) {
    logger.error(`[VFIDE] Invalid contract address for ${name}: ${address}. This is a configuration error!`)
    return ZERO_ADDRESS
  }
  return address as `0x${string}`
}

export const CONTRACT_ADDRESSES = {
  VFIDEToken: validateContractAddress(process.env.NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS, 'VFIDEToken'),
  StablecoinRegistry: validateContractAddress(process.env.NEXT_PUBLIC_STABLECOIN_REGISTRY_ADDRESS, 'StablecoinRegistry'),
  VFIDECommerce: validateContractAddress(process.env.NEXT_PUBLIC_VFIDE_COMMERCE_ADDRESS, 'VFIDECommerce'),
  MerchantPortal: validateContractAddress(process.env.NEXT_PUBLIC_MERCHANT_PORTAL_ADDRESS, 'MerchantPortal'),
  VaultHub: validateContractAddress(process.env.NEXT_PUBLIC_VAULT_HUB_ADDRESS, 'VaultHub'),
  Seer: validateContractAddress(process.env.NEXT_PUBLIC_SEER_ADDRESS, 'Seer'),
  SeerAutonomous: validateContractAddress(process.env.NEXT_PUBLIC_SEER_AUTONOMOUS_ADDRESS, 'SeerAutonomous'),
  SeerGuardian: validateContractAddress(process.env.NEXT_PUBLIC_SEER_GUARDIAN_ADDRESS, 'SeerGuardian'),
  SeerView: validateContractAddress(process.env.NEXT_PUBLIC_SEER_VIEW_ADDRESS, 'SeerView'),
  DAO: validateContractAddress(process.env.NEXT_PUBLIC_DAO_ADDRESS, 'DAO'),
  DAOTimelock: validateContractAddress(process.env.NEXT_PUBLIC_DAO_TIMELOCK_ADDRESS, 'DAOTimelock'),
  TrustGateway: validateContractAddress(process.env.NEXT_PUBLIC_TRUST_GATEWAY_ADDRESS, 'TrustGateway'),
  BadgeNFT: validateContractAddress(process.env.NEXT_PUBLIC_BADGE_NFT_ADDRESS, 'BadgeNFT'),
  SecurityHub: validateContractAddress(process.env.NEXT_PUBLIC_SECURITY_HUB_ADDRESS, 'SecurityHub'),
  GuardianRegistry: validateContractAddress(process.env.NEXT_PUBLIC_GUARDIAN_REGISTRY_ADDRESS, 'GuardianRegistry'),
  GuardianLock: validateContractAddress(process.env.NEXT_PUBLIC_GUARDIAN_LOCK_ADDRESS, 'GuardianLock'),
  PanicGuard: validateContractAddress(process.env.NEXT_PUBLIC_PANIC_GUARD_ADDRESS, 'PanicGuard'),
  EmergencyBreaker: validateContractAddress(process.env.NEXT_PUBLIC_EMERGENCY_BREAKER_ADDRESS, 'EmergencyBreaker'),
  // Additional contracts
  BurnRouter: validateContractAddress(process.env.NEXT_PUBLIC_BURN_ROUTER_ADDRESS, 'BurnRouter'),
  LiquidityIncentives: validateContractAddress(process.env.NEXT_PUBLIC_LIQUIDITY_INCENTIVES_ADDRESS, 'LiquidityIncentives'),
  DutyDistributor: validateContractAddress(process.env.NEXT_PUBLIC_DUTY_DISTRIBUTOR_ADDRESS, 'DutyDistributor'),
  PayrollManager: validateContractAddress(process.env.NEXT_PUBLIC_PAYROLL_MANAGER_ADDRESS, 'PayrollManager'),
  CouncilElection: validateContractAddress(process.env.NEXT_PUBLIC_COUNCIL_ELECTION_ADDRESS, 'CouncilElection'),
  CouncilSalary: validateContractAddress(process.env.NEXT_PUBLIC_COUNCIL_SALARY_ADDRESS, 'CouncilSalary'),
  SubscriptionManager: validateContractAddress(process.env.NEXT_PUBLIC_SUBSCRIPTION_MANAGER_ADDRESS, 'SubscriptionManager'),
  SanctumVault: validateContractAddress(process.env.NEXT_PUBLIC_SANCTUM_VAULT_ADDRESS, 'SanctumVault'),
  DevReserveVesting: validateContractAddress(process.env.NEXT_PUBLIC_DEV_VAULT_ADDRESS, 'DevReserveVesting'),
  SeerSocial: validateContractAddress(process.env.NEXT_PUBLIC_SEER_SOCIAL_ADDRESS, 'SeerSocial'),
  EcosystemVault: validateContractAddress(process.env.NEXT_PUBLIC_ECOSYSTEM_VAULT_ADDRESS, 'EcosystemVault'),
  VaultRegistry: validateContractAddress(process.env.NEXT_PUBLIC_VAULT_REGISTRY_ADDRESS, 'VaultRegistry'),
  CommerceEscrow: validateContractAddress(process.env.NEXT_PUBLIC_COMMERCE_ESCROW_ADDRESS, 'CommerceEscrow'),
}

// Legacy ABI alias names for compatibility with existing hooks
export const MERCHANT_PORTAL_ABI = MerchantPortalABI;
export const SEER_ABI = SeerABI;
export const VFIDE_TOKEN_ABI = VFIDETokenABI;
// Use full VaultHub (VaultInfrastructure) instead of VaultHubLite for all features
export const VAULT_HUB_ABI = VaultHubABI;
// UserVault ABI for individual vault operations (Next of Kin, guardians, inheritance)
export const USER_VAULT_ABI = UserVaultABI;
// CardBoundVault ABI for ATM-card style authorization and vault-to-vault transfers.
export const CARD_BOUND_VAULT_ABI = CardBoundVaultABI;

export type VaultImplementation = 'uservault' | 'cardbound';

export const ACTIVE_VAULT_IMPLEMENTATION: VaultImplementation =
  process.env.NEXT_PUBLIC_VAULT_IMPLEMENTATION === 'uservault' ? 'uservault' : 'cardbound';

export const ACTIVE_VAULT_ABI =
  ACTIVE_VAULT_IMPLEMENTATION === 'cardbound' ? CARD_BOUND_VAULT_ABI : USER_VAULT_ABI;

export const isCardBoundVaultMode = (): boolean => ACTIVE_VAULT_IMPLEMENTATION === 'cardbound';

export {
  VFIDETokenABI,
  StablecoinRegistryABI,
  VaultInfrastructureABI,
  VaultHubABI,
  UserVaultABI,
  CardBoundVaultABI,
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
  CommerceEscrowABI,
  VaultHubLiteABI,
  UserVaultLiteABI,
  BurnRouterABI,
  DutyDistributorABI,
  CouncilElectionABI,
  CouncilSalaryABI,
  SubscriptionManagerABI,
  SanctumVaultABI,
  DevReserveVestingABI,
  PayrollManagerABI,
  EcosystemVaultABI,
  VaultRegistryABI,
  ERC20ABI,
  SeerSocialABI,
  SeerViewABI,
  UserRewardsABI,
  PromotionalTreasuryABI,
}
