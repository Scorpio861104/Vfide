// Auto-generated contract ABIs
// Run: ./scripts/build-contracts.sh to regenerate

import VFIDETokenRaw from './VFIDEToken.json'
import StablecoinRegistryRaw from './StablecoinRegistry.json'
import VaultInfrastructureRaw from './VaultInfrastructure.json'
import VaultHubFullRaw from './VaultHub.json'
import CardBoundVaultRaw from './CardBoundVault.json'
import CardBoundVaultAdminManagerRaw from './CardBoundVaultAdminManager.json'
import CardBoundVaultPaymentQueueManagerRaw from './CardBoundVaultPaymentQueueManager.json'
import SeerRaw from './Seer.json'
import DAORaw from './DAO.json'
import DAOTimelockRaw from './DAOTimelock.json'
import MerchantPortalRaw from './MerchantPortal.json'
import VFIDECommerceRaw from './VFIDECommerce.json'
import ProofScoreBurnRouterRaw from './ProofScoreBurnRouter.json'
import ProofLedgerRaw from './ProofLedger.json'
// New consolidated ABIs
import DutyDistributorRaw from './DutyDistributor.json'
import SanctumVaultRaw from './SanctumVault.json'
import DevReserveVestingRaw from './DevReserveVesting.json'
import PayrollManagerRaw from './PayrollManager.json'
import EcosystemVaultRaw from './EcosystemVault.json'
import EcosystemVaultViewRaw from './EcosystemVaultView.json'
import EcoTreasuryVaultRaw from './EcoTreasuryVault.json'
import VaultRegistryRaw from './VaultRegistry.json'
import ERC20Raw from './ERC20.json'
import SeerSocialRaw from './SeerSocial.json'
import SeerViewRaw from './SeerView.json'
import OwnerControlPanelRaw from './OwnerControlPanel.json'
import BadgeManagerRaw from './BadgeManager.json'
import FeeDistributorRaw from './FeeDistributor.json'
import SystemHandoverRaw from './SystemHandover.json'
import VFIDEBridgeRaw from './VFIDEBridge.json'
import AdminMultiSigRaw from './AdminMultiSig.json'
import CircuitBreakerRaw from './CircuitBreaker.json'
import EmergencyControlRaw from './EmergencyControl.json'
import VFIDEBenefitsRaw from './VFIDEBenefits.json'
import FraudRegistryRaw from './FraudRegistry.json'
import VFIDETestnetFaucetRaw from './VFIDETestnetFaucet.json'
import GovernanceHooksRaw from './GovernanceHooks.json'
import BadgeRegistryRaw from './BadgeRegistry.json'
import SeerGuardianRaw from './SeerGuardian.json'
import SeerPolicyGuardRaw from './SeerPolicyGuard.json'
import MainstreamPaymentsRaw from './MainstreamPayments.json'
import BadgeQualificationRulesRaw from './BadgeQualificationRules.json'
import BridgeSecurityModuleRaw from './BridgeSecurityModule.json'
import DeployPhase3PeripheralsRaw from './DeployPhase3Peripherals.json'
import DevReserveVestingVaultRaw from './DevReserveVestingVault.json'
import LiquidityIncentivesRaw from './LiquidityIncentives.json'
import RevenueSplitterRaw from './RevenueSplitter.json'
import SeerWorkAttestationRaw from './SeerWorkAttestation.json'
import ServicePoolRaw from './ServicePool.json'
import VFIDEAccessControlRaw from './VFIDEAccessControl.json'
import VFIDEEnterpriseGatewayRaw from './VFIDEEnterpriseGateway.json'
import VFIDEPriceOracleRaw from './VFIDEPriceOracle.json'
import VaultRecoveryClaimRaw from './VaultRecoveryClaim.json'
import VFIDETermLoanRaw from './VFIDETermLoan.json'
import VFIDEFlashLoanRaw from './VFIDEFlashLoan.json'
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
const StablecoinRegistryABI = normalizeImportedABI(StablecoinRegistryRaw);
const VaultInfrastructureABI = normalizeImportedABI(VaultInfrastructureRaw);
const VaultHubFullABI = normalizeImportedABI(VaultHubFullRaw);
const CardBoundVaultABI = normalizeImportedABI(CardBoundVaultRaw);
const CardBoundVaultAdminManagerABI = normalizeImportedABI(CardBoundVaultAdminManagerRaw);
const CardBoundVaultPaymentQueueManagerABI = normalizeImportedABI(CardBoundVaultPaymentQueueManagerRaw);
const SeerABI = normalizeImportedABI(SeerRaw);
const DAOABI = normalizeImportedABI(DAORaw);
const DAOTimelockABI = normalizeImportedABI(DAOTimelockRaw);
const MerchantPortalABI = normalizeImportedABI(MerchantPortalRaw);
// VFIDECommerce.json contains MerchantRegistry + VFIDECommerce + CommerceEscrow ABIs
// merged into one array. Re-exported as MerchantRegistryABI so the merchant-identity
// hook can target the registry surface (setMetaHash, merchants, delistMerchant, etc.)
// without pulling in unrelated escrow / commerce surface separately.
const MerchantRegistryABI = normalizeImportedABI(VFIDECommerceRaw);
const ProofScoreBurnRouterABI = normalizeImportedABI(ProofScoreBurnRouterRaw);
const ProofLedgerABI = normalizeImportedABI(ProofLedgerRaw);
const DutyDistributorABI = normalizeImportedABI(DutyDistributorRaw);
const SanctumVaultABI = normalizeImportedABI(SanctumVaultRaw);
const DevReserveVestingABI = normalizeImportedABI(DevReserveVestingRaw);
const PayrollManagerABI = normalizeImportedABI(PayrollManagerRaw);
const EcosystemVaultABI = normalizeImportedABI(EcosystemVaultRaw);
const EcosystemVaultViewABI = normalizeImportedABI(EcosystemVaultViewRaw);
const EcoTreasuryVaultABI = normalizeImportedABI(EcoTreasuryVaultRaw);
const VaultRegistryABI = normalizeImportedABI(VaultRegistryRaw);
const ERC20ABI = normalizeImportedABI(ERC20Raw);
const SeerSocialABI = normalizeImportedABI(SeerSocialRaw);
const SeerViewABI = normalizeImportedABI(SeerViewRaw);
const OwnerControlPanelABI = normalizeImportedABI(OwnerControlPanelRaw);
const BadgeManagerABI = normalizeImportedABI(BadgeManagerRaw);
const FeeDistributorABI = normalizeImportedABI(FeeDistributorRaw);
const SystemHandoverABI = normalizeImportedABI(SystemHandoverRaw);
const VFIDEBridgeABI = normalizeImportedABI(VFIDEBridgeRaw);
const AdminMultiSigABI = normalizeImportedABI(AdminMultiSigRaw);
const CircuitBreakerABI = normalizeImportedABI(CircuitBreakerRaw);
const EmergencyControlABI = normalizeImportedABI(EmergencyControlRaw);
const VFIDEBenefitsABI = normalizeImportedABI(VFIDEBenefitsRaw);
const FraudRegistryABI = normalizeImportedABI(FraudRegistryRaw);
const VFIDETestnetFaucetABI = normalizeImportedABI(VFIDETestnetFaucetRaw);
const GovernanceHooksABI = normalizeImportedABI(GovernanceHooksRaw);
const BadgeRegistryABI = normalizeImportedABI(BadgeRegistryRaw);
const SeerGuardianABI = normalizeImportedABI(SeerGuardianRaw);
const SeerPolicyGuardABI = normalizeImportedABI(SeerPolicyGuardRaw);
const MainstreamPaymentsABI = normalizeImportedABI(MainstreamPaymentsRaw);
const BadgeQualificationRulesABI = normalizeImportedABI(BadgeQualificationRulesRaw);
const BridgeSecurityModuleABI = normalizeImportedABI(BridgeSecurityModuleRaw);
const DeployPhase3PeripheralsABI = normalizeImportedABI(DeployPhase3PeripheralsRaw);
const DevReserveVestingVaultABI = normalizeImportedABI(DevReserveVestingVaultRaw);
const LiquidityIncentivesABI = normalizeImportedABI(LiquidityIncentivesRaw);
const RevenueSplitterABI = normalizeImportedABI(RevenueSplitterRaw);
const SeerWorkAttestationABI = normalizeImportedABI(SeerWorkAttestationRaw);
const ServicePoolABI = normalizeImportedABI(ServicePoolRaw);
const VFIDEAccessControlABI = normalizeImportedABI(VFIDEAccessControlRaw);
const VFIDEEnterpriseGatewayABI = normalizeImportedABI(VFIDEEnterpriseGatewayRaw);
const VFIDEPriceOracleABI = normalizeImportedABI(VFIDEPriceOracleRaw);
const VaultRecoveryClaimABI = normalizeImportedABI(VaultRecoveryClaimRaw);
const VFIDETermLoanABI = normalizeImportedABI(VFIDETermLoanRaw);
const VFIDEFlashLoanABI = normalizeImportedABI(VFIDEFlashLoanRaw);

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
validateABI(CardBoundVaultAdminManagerABI, 'CardBoundVaultAdminManager');
validateABI(CardBoundVaultPaymentQueueManagerABI, 'CardBoundVaultPaymentQueueManager');
validateABI(SeerABI, 'Seer');
validateABI(DAOABI, 'DAO');
validateABI(DAOTimelockABI, 'DAOTimelock');
validateABI(MerchantPortalABI, 'MerchantPortal');
validateABI(MerchantRegistryABI, 'MerchantRegistry');
validateABI(ProofScoreBurnRouterABI, 'ProofScoreBurnRouter');
validateABI(ProofLedgerABI, 'ProofLedger');
// Validate new ABIs
validateABI(DutyDistributorABI, 'DutyDistributor');
validateABI(SanctumVaultABI, 'SanctumVault');
validateABI(DevReserveVestingABI, 'DevReserveVesting');
validateABI(PayrollManagerABI, 'PayrollManager');
validateABI(EcosystemVaultABI, 'EcosystemVault');
validateABI(EcosystemVaultViewABI, 'EcosystemVaultView');
validateABI(EcoTreasuryVaultABI, 'EcoTreasuryVault');
validateABI(VaultRegistryABI, 'VaultRegistry');
validateABI(ERC20ABI, 'ERC20');
validateABI(SeerSocialABI, 'SeerSocial');
validateABI(SeerViewABI, 'SeerView');
validateABI(OwnerControlPanelABI, 'OwnerControlPanel');
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
  CardBoundVaultAdminManagerABI,
  CardBoundVaultPaymentQueueManagerABI,
  SeerABI,
  DAOABI,
  DAOTimelockABI,
  MerchantPortalABI,
  MerchantRegistryABI,
  ProofScoreBurnRouterABI,
  ProofLedgerABI,
  // New consolidated exports
  DutyDistributorABI,
  SanctumVaultABI,
  DevReserveVestingABI,
  PayrollManagerABI,
  EcosystemVaultABI,
  EcosystemVaultViewABI,
  EcoTreasuryVaultABI,
  VaultRegistryABI,
  ERC20ABI,
  SeerSocialABI,
  SeerViewABI,
  OwnerControlPanelABI,
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
