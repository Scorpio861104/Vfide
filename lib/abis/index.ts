// Auto-generated contract ABIs
// Run: ./scripts/build-contracts.sh to regenerate

import VFIDETokenRaw from './VFIDEToken.json'
import StablecoinRegistryABI from './StablecoinRegistry.json'
import VaultInfrastructureABI from './VaultInfrastructure.json'
import VaultHubFullRaw from './VaultHub.json'
import CardBoundVaultABI from './CardBoundVault.json'
import SeerRaw from './Seer.json'
import DAOABI from './DAO.json'
import DAOTimelockABI from './DAOTimelock.json'
import MerchantPortalABI from './MerchantPortal.json'
import ProofScoreBurnRouterABI from './ProofScoreBurnRouter.json'
import ProofLedgerABI from './ProofLedger.json'
// New consolidated ABIs
import DutyDistributorABI from './DutyDistributor.json'
import SanctumVaultABI from './SanctumVault.json'
import DevReserveVestingABI from './DevReserveVesting.json'
import PayrollManagerABI from './PayrollManager.json'
import EcosystemVaultRaw from './EcosystemVault.json'
import EcosystemVaultViewABI from './EcosystemVaultView.json'
import VaultRegistryABI from './VaultRegistry.json'
import ERC20ABI from './ERC20.json'
import SeerSocialABI from './SeerSocial.json'
import SeerViewABI from './SeerView.json'
import OwnerControlPanelABI from './OwnerControlPanel.json'
import EscrowManagerABI from './EscrowManager.json'
import BadgeManagerABI from './BadgeManager.json'
import FeeDistributorABI from './FeeDistributor.json'
import SystemHandoverABI from './SystemHandover.json'
import VFIDEBridgeRaw from './VFIDEBridge.json'
import AdminMultiSigABI from './AdminMultiSig.json'
import CircuitBreakerABI from './CircuitBreaker.json'
import EmergencyControlABI from './EmergencyControl.json'
import VFIDEBenefitsABI from './VFIDEBenefits.json'
import FraudRegistryABI from './FraudRegistry.json'
import VFIDETestnetFaucetABI from './VFIDETestnetFaucet.json'
import GovernanceHooksABI from './GovernanceHooks.json'
import BadgeRegistryABI from './BadgeRegistry.json'
import SeerGuardianABI from './SeerGuardian.json'
import SeerPolicyGuardABI from './SeerPolicyGuard.json'
import MainstreamPaymentsABI from './MainstreamPayments.json'
import BadgeQualificationRulesABI from './BadgeQualificationRules.json'
import BridgeSecurityModuleABI from './BridgeSecurityModule.json'
import DeployPhase3PeripheralsABI from './DeployPhase3Peripherals.json'
import DevReserveVestingVaultABI from './DevReserveVestingVault.json'
import LiquidityIncentivesABI from './LiquidityIncentives.json'
import RevenueSplitterABI from './RevenueSplitter.json'
import SeerWorkAttestationABI from './SeerWorkAttestation.json'
import ServicePoolABI from './ServicePool.json'
import VFIDEAccessControlABI from './VFIDEAccessControl.json'
import VFIDEEnterpriseGatewayABI from './VFIDEEnterpriseGateway.json'
import VFIDEPriceOracleABI from './VFIDEPriceOracle.json'
import VaultRecoveryClaimABI from './VaultRecoveryClaim.json'
import VFIDETermLoanABI from './VFIDETermLoan.json'
import VFIDEFlashLoanABI from './VFIDEFlashLoan.json'
import { logger } from '@/lib/logger';

const KNOWN_EMPTY_ABIS = new Set([
  'DeployPhase3Peripherals',
  'DevReserveVestingVault',
]);

const abiWarningState = ((globalThis as typeof globalThis & {
  __vfideAbiWarnings?: Set<string>;
}).__vfideAbiWarnings ??= new Set<string>());

function normalizeImportedABI(input: unknown): unknown[] {
  if (Array.isArray(input)) return input;
  if (input && typeof input === 'object' && Array.isArray((input as { abi?: unknown }).abi)) {
    return (input as { abi: unknown[] }).abi;
  }
  return [];
}

const VFIDETokenABI = normalizeImportedABI(VFIDETokenRaw);
const VaultHubFullABI = normalizeImportedABI(VaultHubFullRaw);
const SeerABI = normalizeImportedABI(SeerRaw);
const EcosystemVaultABI = normalizeImportedABI(EcosystemVaultRaw);
const VFIDEBridgeABI = normalizeImportedABI(VFIDEBridgeRaw);

// Runtime validation: Ensure ABIs are valid arrays
function validateABI(abi: unknown, name: string): unknown[] {
  if (!Array.isArray(abi)) {
    throw new Error(`Invalid ABI for ${name}: Expected array, got ${typeof abi}`);
  }
  if (abi.length === 0 && !abiWarningState.has(name)) {
    abiWarningState.add(name);
    if (KNOWN_EMPTY_ABIS.has(name)) {
      logger.info(`[VFIDE] Empty ABI allowed for ${name} (library/deployment artifact).`);
    } else {
      logger.warn(`[VFIDE] Warning: Empty ABI for ${name}`);
    }
  }
  return abi;
}

// Validate all imported ABIs
validateABI(VFIDETokenABI, 'VFIDEToken');
validateABI(StablecoinRegistryABI, 'StablecoinRegistry');
validateABI(VaultInfrastructureABI, 'VaultInfrastructure');
// Legacy ABI alias: UserVault was removed in vault-only mode.
// Keep exports mapped to CardBoundVault ABI for compile-time compatibility.
const UserVaultABI = CardBoundVaultABI;
validateABI(UserVaultABI, 'UserVault');
validateABI(CardBoundVaultABI, 'CardBoundVault');
validateABI(SeerABI, 'Seer');
validateABI(DAOABI, 'DAO');
validateABI(DAOTimelockABI, 'DAOTimelock');
validateABI(MerchantPortalABI, 'MerchantPortal');
validateABI(ProofScoreBurnRouterABI, 'ProofScoreBurnRouter');
validateABI(ProofLedgerABI, 'ProofLedger');
// Validate new ABIs
validateABI(DutyDistributorABI, 'DutyDistributor');
validateABI(SanctumVaultABI, 'SanctumVault');
validateABI(DevReserveVestingABI, 'DevReserveVesting');
validateABI(PayrollManagerABI, 'PayrollManager');
validateABI(EcosystemVaultABI, 'EcosystemVault');
validateABI(EcosystemVaultViewABI, 'EcosystemVaultView');
validateABI(VaultRegistryABI, 'VaultRegistry');
validateABI(ERC20ABI, 'ERC20');
validateABI(SeerSocialABI, 'SeerSocial');
validateABI(SeerViewABI, 'SeerView');
validateABI(OwnerControlPanelABI, 'OwnerControlPanel');
validateABI(EscrowManagerABI, 'EscrowManager');
validateABI(BadgeManagerABI, 'BadgeManager');
validateABI(FeeDistributorABI, 'FeeDistributor');
validateABI(SystemHandoverABI, 'SystemHandover');
validateABI(VFIDEBridgeABI, 'VFIDEBridge');
validateABI(AdminMultiSigABI, 'AdminMultiSig');
validateABI(CircuitBreakerABI, 'CircuitBreaker');
validateABI(EmergencyControlABI, 'EmergencyControl');
validateABI(VFIDEBenefitsABI, 'VFIDEBenefits');
validateABI(FraudRegistryABI, 'FraudRegistry');
validateABI(VFIDETestnetFaucetABI, 'VFIDETestnetFaucet');
validateABI(GovernanceHooksABI, 'GovernanceHooks');
validateABI(BadgeRegistryABI, 'BadgeRegistry');
validateABI(SeerGuardianABI, 'SeerGuardian');
validateABI(SeerPolicyGuardABI, 'SeerPolicyGuard');
validateABI(MainstreamPaymentsABI, 'MainstreamPayments');

validateABI(BadgeQualificationRulesABI, 'BadgeQualificationRules');

validateABI(BridgeSecurityModuleABI, 'BridgeSecurityModule');

validateABI(DeployPhase3PeripheralsABI, 'DeployPhase3Peripherals');

validateABI(DevReserveVestingVaultABI, 'DevReserveVestingVault');

validateABI(LiquidityIncentivesABI, 'LiquidityIncentives');

validateABI(RevenueSplitterABI, 'RevenueSplitter');

validateABI(SeerWorkAttestationABI, 'SeerWorkAttestation');

validateABI(ServicePoolABI, 'ServicePool');

validateABI(VFIDEAccessControlABI, 'VFIDEAccessControl');

validateABI(VFIDEEnterpriseGatewayABI, 'VFIDEEnterpriseGateway');

validateABI(VFIDEPriceOracleABI, 'VFIDEPriceOracle');

validateABI(VaultRecoveryClaimABI, 'VaultRecoveryClaim');

// VaultHub ABI — getVaultInfo/checkVaultStatus/predictVaultsBatch removed for size; use VaultRegistry.getVaultInfo instead.
validateABI(VaultHubFullABI, 'VaultHub');
const VaultHubABI = VaultHubFullABI

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
  // New consolidated exports
  DutyDistributorABI,
  SanctumVaultABI,
  DevReserveVestingABI,
  PayrollManagerABI,
  EcosystemVaultABI,
  EcosystemVaultViewABI,
  VaultRegistryABI,
  ERC20ABI,
  SeerSocialABI,
  SeerViewABI,
  OwnerControlPanelABI,
  EscrowManagerABI,
  BadgeManagerABI,
  FeeDistributorABI,
  SystemHandoverABI,
  VFIDEBridgeABI,
  AdminMultiSigABI,
  CircuitBreakerABI,
  EmergencyControlABI,
  VFIDEBenefitsABI,
  FraudRegistryABI,
  VFIDETestnetFaucetABI,
  GovernanceHooksABI,
  BadgeRegistryABI,
  SeerGuardianABI,
  SeerPolicyGuardABI,
  MainstreamPaymentsABI,
  BadgeQualificationRulesABI,
  BridgeSecurityModuleABI,
  DeployPhase3PeripheralsABI,
  DevReserveVestingVaultABI,
  LiquidityIncentivesABI,
  RevenueSplitterABI,
  SeerWorkAttestationABI,
  ServicePoolABI,
  VFIDEAccessControlABI,
  VFIDEEnterpriseGatewayABI,
  VFIDEPriceOracleABI,
  VaultRecoveryClaimABI,
  VFIDETermLoanABI,
  VFIDEFlashLoanABI,
}
