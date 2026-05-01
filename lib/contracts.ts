/**
 * VFIDE Contract Addresses and ABIs
 * 
 * REFACTORED: Now imports ABIs from JSON artifacts to ensure consistency.
 * Legacy constant names (e.g. VFIDE_TOKEN_ABI) are preserved as aliases.
 */
import { isAddress } from 'viem'
import { ZERO_ADDRESS } from './constants'
import { CURRENT_CHAIN_ID } from './testnet'
import {
  VFIDETokenABI,
  StablecoinRegistryABI,
  VaultInfrastructureABI,
  VaultHubABI,
  UserVaultABI,
  CardBoundVaultABI,
  SeerABI,
  DAOABI,
  DAOTimelockABI,
  MerchantPortalABI,
  ProofScoreBurnRouterABI,
  ProofLedgerABI,
  OwnerControlPanelABI,
  EscrowManagerABI,
  DutyDistributorABI,
  SanctumVaultABI,
  DevReserveVestingABI,
  PayrollManagerABI,
  EcosystemVaultABI,
  EcosystemVaultViewABI,
  VaultRegistryABI,
  VaultRecoveryClaimABI,
  FeeDistributorABI,
  ERC20ABI,
  SeerSocialABI,
  SeerViewABI,
  FraudRegistryABI,
  VFIDETestnetFaucetABI,
  VFIDETermLoanABI,
  VFIDEFlashLoanABI,
} from './abis'
import { logger } from '@/lib/logger';

export { ZERO_ADDRESS }

const contractAddressWarningState = ((globalThis as typeof globalThis & {
  __vfideContractWarnings?: Set<string>;
}).__vfideContractWarnings ??= new Set<string>());

function logContractAddressIssue(level: 'info' | 'warn' | 'error', message: string) {
  if (contractAddressWarningState.has(message)) {
    return;
  }
  contractAddressWarningState.add(message);

  if (level === 'error') {
    logger.error(message);
    return;
  }

  if (level === 'warn') {
    logger.warn(message);
    return;
  }

  logger.info(message);
}

const CONTRACT_ENV_VAR_MAP: Record<string, string> = {
  VFIDEToken: 'NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS',
  StablecoinRegistry: 'NEXT_PUBLIC_STABLECOIN_REGISTRY_ADDRESS',
  MerchantPortal: 'NEXT_PUBLIC_MERCHANT_PORTAL_ADDRESS',
  VaultHub: 'NEXT_PUBLIC_VAULT_HUB_ADDRESS',
  Seer: 'NEXT_PUBLIC_SEER_ADDRESS',
  SeerView: 'NEXT_PUBLIC_SEER_VIEW_ADDRESS',
  DAO: 'NEXT_PUBLIC_DAO_ADDRESS',
  DAOTimelock: 'NEXT_PUBLIC_DAO_TIMELOCK_ADDRESS',
  TrustGateway: 'NEXT_PUBLIC_TRUST_GATEWAY_ADDRESS',
  GuardianRegistry: 'NEXT_PUBLIC_GUARDIAN_REGISTRY_ADDRESS',
  GuardianLock: 'NEXT_PUBLIC_GUARDIAN_LOCK_ADDRESS',
  PanicGuard: 'NEXT_PUBLIC_PANIC_GUARD_ADDRESS',
  EmergencyBreaker: 'NEXT_PUBLIC_EMERGENCY_BREAKER_ADDRESS',
  ProofScoreBurnRouter: 'NEXT_PUBLIC_BURN_ROUTER_ADDRESS',
  ProofLedger: 'NEXT_PUBLIC_PROOF_LEDGER_ADDRESS',
  LiquidityIncentives: 'NEXT_PUBLIC_LIQUIDITY_INCENTIVES_ADDRESS',
  DutyDistributor: 'NEXT_PUBLIC_DUTY_DISTRIBUTOR_ADDRESS',
  OwnerControlPanel: 'NEXT_PUBLIC_OWNER_CONTROL_PANEL_ADDRESS',
  PayrollManager: 'NEXT_PUBLIC_PAYROLL_MANAGER_ADDRESS',
  SanctumVault: 'NEXT_PUBLIC_SANCTUM_VAULT_ADDRESS',
  DevReserveVesting: 'NEXT_PUBLIC_DEV_VAULT_ADDRESS',
  EscrowManager: 'NEXT_PUBLIC_ESCROW_MANAGER_ADDRESS',
  FeeDistributor: 'NEXT_PUBLIC_FEE_DISTRIBUTOR_ADDRESS',
  SeerSocial: 'NEXT_PUBLIC_SEER_SOCIAL_ADDRESS',
  EcosystemVault: 'NEXT_PUBLIC_ECOSYSTEM_VAULT_ADDRESS',
  EcosystemVaultView: 'NEXT_PUBLIC_ECOSYSTEM_VAULT_VIEW_ADDRESS',
  VaultRegistry: 'NEXT_PUBLIC_VAULT_REGISTRY_ADDRESS',
  VaultRecoveryClaim: 'NEXT_PUBLIC_VAULT_RECOVERY_CLAIM_ADDRESS',
  CommerceEscrow: 'NEXT_PUBLIC_COMMERCE_ESCROW_ADDRESS',
  FraudRegistry: 'NEXT_PUBLIC_FRAUD_REGISTRY_ADDRESS',
  VFIDETestnetFaucet: 'NEXT_PUBLIC_FAUCET_ADDRESS',
  VFIDETermLoan: 'NEXT_PUBLIC_TERM_LOAN_ADDRESS',
  VFIDEFlashLoan: 'NEXT_PUBLIC_FLASH_LOAN_ADDRESS',
};

function resolveChainScopedAddress(name: string, fallbackAddress: string | undefined, chainId: number): { address: string | undefined; envVarName: string; chainScopedEnvVarName: string } {
  const envVarName = CONTRACT_ENV_VAR_MAP[name] ?? `NEXT_PUBLIC_${name.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase()}_ADDRESS`;
  const chainScopedEnvVarName = `${envVarName}_${chainId}`;
  const chainScopedAddress = process.env[chainScopedEnvVarName];
  return {
    address: chainScopedAddress ?? fallbackAddress,
    envVarName,
    chainScopedEnvVarName,
  };
}

/**
 * Validate contract address at runtime
 * Returns properly typed address, or zero address if invalid/missing
 * Runtime validation logs warnings for debugging
 */
function validateContractAddress(address: string | undefined, name: string, chainId: number = CURRENT_CHAIN_ID): `0x${string}` {
  const isProduction = process.env.NODE_ENV === 'production';
  const isServer = typeof window === 'undefined';
  const frontendOnlyEnv = process.env.FRONTEND_SELF_CONTAINED ?? process.env.NEXT_PUBLIC_FRONTEND_ONLY;
  const missingServerSecrets = !process.env.DATABASE_URL || !process.env.JWT_SECRET;
  const autoFrontendOnly =
    frontendOnlyEnv !== 'false' &&
    missingServerSecrets;
  const frontendOnly = frontendOnlyEnv === 'true' || autoFrontendOnly;
  // Keep strictness for server/runtime checks, but never crash client render trees.
  const strictProduction = isProduction && !frontendOnly && isServer;

  const resolved = resolveChainScopedAddress(name, address, chainId);

  if (!resolved.address) {
    if (strictProduction) {
      logContractAddressIssue('error', `[VFIDE] Missing contract address in production: ${name}. Set ${resolved.chainScopedEnvVarName} (preferred) or ${resolved.envVarName} in environment. All calls to this contract will fail.`)
      throw new Error(`[VFIDE] Missing required contract address in production: ${name}`)
    } else {
      const runtimeHint = frontendOnly ? 'frontend-only mode' : 'non-production runtime';
      const level = frontendOnly ? 'info' : 'warn';
      logContractAddressIssue(level, `[VFIDE] Missing contract address: ${name}. Using ZERO_ADDRESS in ${runtimeHint}. Set ${resolved.chainScopedEnvVarName} (preferred) or ${resolved.envVarName} in environment.`)
    }
    return ZERO_ADDRESS
  }
  if (!isAddress(resolved.address)) {
    logContractAddressIssue('error', `[VFIDE] Invalid contract address for ${name}: ${resolved.address}. This is a configuration error!`)
    if (strictProduction) {
      throw new Error(`[VFIDE] Invalid contract address in production for ${name}`)
    }
    return ZERO_ADDRESS
  }
  return resolved.address as `0x${string}`
}

export function isConfiguredContractAddress(address: string | undefined | null): address is `0x${string}` {
  return typeof address === 'string' && isAddress(address) && address !== ZERO_ADDRESS
}

export function getContractConfigurationError(name: string): Error {
  const envVarName = CONTRACT_ENV_VAR_MAP[name] ?? `NEXT_PUBLIC_${name.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase()}_ADDRESS`
  return new Error(`[VFIDE] ${name} contract not configured. Set ${envVarName} in the environment.`)
}

function buildContractAddresses(chainId: number = CURRENT_CHAIN_ID) {
  return {
    VFIDEToken: validateContractAddress(process.env.NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS, 'VFIDEToken', chainId),
    StablecoinRegistry: validateContractAddress(process.env.NEXT_PUBLIC_STABLECOIN_REGISTRY_ADDRESS, 'StablecoinRegistry', chainId),
    MerchantPortal: validateContractAddress(process.env.NEXT_PUBLIC_MERCHANT_PORTAL_ADDRESS, 'MerchantPortal', chainId),
    VaultHub: validateContractAddress(process.env.NEXT_PUBLIC_VAULT_HUB_ADDRESS, 'VaultHub', chainId),
    Seer: validateContractAddress(process.env.NEXT_PUBLIC_SEER_ADDRESS, 'Seer', chainId),
    SeerView: validateContractAddress(process.env.NEXT_PUBLIC_SEER_VIEW_ADDRESS, 'SeerView', chainId),
    DAO: validateContractAddress(process.env.NEXT_PUBLIC_DAO_ADDRESS, 'DAO', chainId),
    DAOTimelock: validateContractAddress(process.env.NEXT_PUBLIC_DAO_TIMELOCK_ADDRESS, 'DAOTimelock', chainId),
    TrustGateway: validateContractAddress(process.env.NEXT_PUBLIC_TRUST_GATEWAY_ADDRESS, 'TrustGateway', chainId),
    GuardianRegistry: validateContractAddress(process.env.NEXT_PUBLIC_GUARDIAN_REGISTRY_ADDRESS, 'GuardianRegistry', chainId),
    GuardianLock: validateContractAddress(process.env.NEXT_PUBLIC_GUARDIAN_LOCK_ADDRESS, 'GuardianLock', chainId),
    PanicGuard: validateContractAddress(process.env.NEXT_PUBLIC_PANIC_GUARD_ADDRESS, 'PanicGuard', chainId),
    EmergencyBreaker: validateContractAddress(process.env.NEXT_PUBLIC_EMERGENCY_BREAKER_ADDRESS, 'EmergencyBreaker', chainId),
    // Additional contracts
    ProofScoreBurnRouter: validateContractAddress(process.env.NEXT_PUBLIC_BURN_ROUTER_ADDRESS, 'ProofScoreBurnRouter', chainId),
    ProofLedger: validateContractAddress(process.env.NEXT_PUBLIC_PROOF_LEDGER_ADDRESS, 'ProofLedger', chainId),
    LiquidityIncentives: validateContractAddress(process.env.NEXT_PUBLIC_LIQUIDITY_INCENTIVES_ADDRESS, 'LiquidityIncentives', chainId),
    DutyDistributor: validateContractAddress(process.env.NEXT_PUBLIC_DUTY_DISTRIBUTOR_ADDRESS, 'DutyDistributor', chainId),
    OwnerControlPanel: validateContractAddress(process.env.NEXT_PUBLIC_OWNER_CONTROL_PANEL_ADDRESS, 'OwnerControlPanel', chainId),
    PayrollManager: validateContractAddress(process.env.NEXT_PUBLIC_PAYROLL_MANAGER_ADDRESS, 'PayrollManager', chainId),
    SanctumVault: validateContractAddress(process.env.NEXT_PUBLIC_SANCTUM_VAULT_ADDRESS, 'SanctumVault', chainId),
    DevReserveVesting: validateContractAddress(process.env.NEXT_PUBLIC_DEV_VAULT_ADDRESS, 'DevReserveVesting', chainId),
    EscrowManager: validateContractAddress(process.env.NEXT_PUBLIC_ESCROW_MANAGER_ADDRESS, 'EscrowManager', chainId),
    FeeDistributor: validateContractAddress(process.env.NEXT_PUBLIC_FEE_DISTRIBUTOR_ADDRESS, 'FeeDistributor', chainId),
    SeerSocial: validateContractAddress(process.env.NEXT_PUBLIC_SEER_SOCIAL_ADDRESS, 'SeerSocial', chainId),
    EcosystemVault: validateContractAddress(process.env.NEXT_PUBLIC_ECOSYSTEM_VAULT_ADDRESS, 'EcosystemVault', chainId),
    EcosystemVaultView: validateContractAddress(process.env.NEXT_PUBLIC_ECOSYSTEM_VAULT_VIEW_ADDRESS, 'EcosystemVaultView', chainId),
    VaultRegistry: validateContractAddress(process.env.NEXT_PUBLIC_VAULT_REGISTRY_ADDRESS, 'VaultRegistry', chainId),
    VaultRecoveryClaim: validateContractAddress(process.env.NEXT_PUBLIC_VAULT_RECOVERY_CLAIM_ADDRESS, 'VaultRecoveryClaim', chainId),
    FraudRegistry: validateContractAddress(process.env.NEXT_PUBLIC_FRAUD_REGISTRY_ADDRESS, 'FraudRegistry', chainId),
    VFIDETestnetFaucet: validateContractAddress(process.env.NEXT_PUBLIC_FAUCET_ADDRESS, 'VFIDETestnetFaucet', chainId),
    VFIDETermLoan: validateContractAddress(process.env.NEXT_PUBLIC_TERM_LOAN_ADDRESS, 'VFIDETermLoan', chainId),
    VFIDEFlashLoan: validateContractAddress(process.env.NEXT_PUBLIC_FLASH_LOAN_ADDRESS, 'VFIDEFlashLoan', chainId),
  };
}

export const CONTRACT_ADDRESSES = buildContractAddresses(CURRENT_CHAIN_ID)

export function getContractAddresses(chainId: number) {
  return buildContractAddresses(chainId);
}

// Legacy ABI alias names for compatibility with existing hooks
export const MERCHANT_PORTAL_ABI = MerchantPortalABI;
export const SEER_ABI = SeerABI;
export const VFIDE_TOKEN_ABI = VFIDETokenABI;
// Use the full VaultHub ABI for all features.
export const VAULT_HUB_ABI = VaultHubABI;
// CardBoundVault is the sole active vault implementation (non-custodial, wallet authorization model)
export const CARD_BOUND_VAULT_ABI = CardBoundVaultABI;
// Legacy alias: UserVaultABI retained only for read-only compat paths, not active runtime
export const USER_VAULT_ABI = UserVaultABI;

export type VaultImplementation = 'cardbound';

function resolveVaultImplementation(): VaultImplementation {
  return 'cardbound';
}

export const ACTIVE_VAULT_IMPLEMENTATION: VaultImplementation = resolveVaultImplementation();

// CardBoundVault is the only active implementation
export const ACTIVE_VAULT_ABI = CARD_BOUND_VAULT_ABI;

export const isCardBoundVaultMode = (): boolean => true;

export {
  VFIDETokenABI,
  StablecoinRegistryABI,
  VaultInfrastructureABI,
  VaultHubABI,
  UserVaultABI,
  CardBoundVaultABI,
  SeerABI,
  DAOABI,
  DAOTimelockABI,
  MerchantPortalABI,
  ProofScoreBurnRouterABI,
  ProofLedgerABI,
  OwnerControlPanelABI,
  EscrowManagerABI,
  DutyDistributorABI,
  SanctumVaultABI,
  DevReserveVestingABI,
  PayrollManagerABI,
  EcosystemVaultABI,
  EcosystemVaultViewABI,
  VaultRegistryABI,
  VaultRecoveryClaimABI,
  FeeDistributorABI,
  ERC20ABI,
  SeerSocialABI,
  SeerViewABI,
  FraudRegistryABI,
  VFIDETestnetFaucetABI,
  VFIDETermLoanABI,
  VFIDEFlashLoanABI,
}
