// Auto-generated contract ABIs
// Run: ./scripts/build-contracts.sh to regenerate

import VFIDETokenRaw from './VFIDEToken.json'
import StablecoinRegistryABI from './StablecoinRegistry.json'
import VaultInfrastructureABI from './VaultInfrastructure.json'
import VaultHubFullRaw from './VaultHub.json'
import UserVaultLiteABI from './UserVaultLite.json'
import UserVaultABI from './UserVault.json'
import CardBoundVaultABI from './CardBoundVault.json'
import SeerRaw from './Seer.json'
import SeerAutonomousABI from './SeerAutonomous.json'
import VFIDEBadgeNFTABI from './VFIDEBadgeNFT.json'
import DAOABI from './DAO.json'
import DAOTimelockABI from './DAOTimelock.json'
import GuardianRegistryABI from './GuardianRegistry.json'
import GuardianLockABI from './GuardianLock.json'
import PanicGuardABI from './PanicGuard.json'
import EmergencyBreakerABI from './EmergencyBreaker.json'
import MerchantRegistryABI from './MerchantRegistry.json'
import MerchantPortalABI from './MerchantPortal.json'
import ProofScoreBurnRouterABI from './ProofScoreBurnRouter.json'
import ProofLedgerABI from './ProofLedger.json'
import CommerceEscrowABI from './CommerceEscrow.json'
// New consolidated ABIs
import BurnRouterABI from './BurnRouter.json'
import DutyDistributorABI from './DutyDistributor.json'
import CouncilElectionABI from './CouncilElection.json'
import CouncilSalaryABI from './CouncilSalary.json'
import SubscriptionManagerABI from './SubscriptionManager.json'
import SanctumVaultABI from './SanctumVault.json'
import DevReserveVestingABI from './DevReserveVesting.json'
import PayrollManagerABI from './PayrollManager.json'
import EcosystemVaultRaw from './EcosystemVault.json'
import EcosystemVaultViewABI from './EcosystemVaultView.json'
import VaultRegistryABI from './VaultRegistry.json'
import ERC20ABI from './ERC20.json'
import SeerSocialABI from './SeerSocial.json'
import SeerViewABI from './SeerView.json'
import UserRewardsABI from './UserRewards.json'
import OwnerControlPanelABI from './OwnerControlPanel.json'
import EscrowManagerABI from './EscrowManager.json'
import BadgeManagerABI from './BadgeManager.json'
import FeeDistributorABI from './FeeDistributor.json'
import SystemHandoverABI from './SystemHandover.json'
import VFIDEBridgeRaw from './VFIDEBridge.json'
import AdminMultiSigABI from './AdminMultiSig.json'
import CircuitBreakerABI from './CircuitBreaker.json'
import EmergencyControlABI from './EmergencyControl.json'
import WithdrawalQueueABI from './WithdrawalQueue.json'
import VFIDEBenefitsABI from './VFIDEBenefits.json'
import FraudRegistryABI from './FraudRegistry.json'
import VFIDETestnetFaucetABI from './VFIDETestnetFaucet.json'
import GovernanceHooksABI from './GovernanceHooks.json'
import BadgeRegistryABI from './BadgeRegistry.json'
import SeerGuardianABI from './SeerGuardian.json'
import SeerPolicyGuardABI from './SeerPolicyGuard.json'
import MainstreamPaymentsABI from './MainstreamPayments.json'
import VFIDECommerceABI from './VFIDECommerce.json'
import BadgeQualificationRulesABI from './BadgeQualificationRules.json'
import BridgeSecurityModuleABI from './BridgeSecurityModule.json'
import DeployPhase3PeripheralsABI from './DeployPhase3Peripherals.json'
import DevReserveVestingVaultABI from './DevReserveVestingVault.json'
import EcosystemVaultLibABI from './EcosystemVaultLib.json'
import LiquidityIncentivesABI from './LiquidityIncentives.json'
import RevenueSplitterABI from './RevenueSplitter.json'
import SeerAutonomousLibABI from './SeerAutonomousLib.json'
import SeerWorkAttestationABI from './SeerWorkAttestation.json'
import ServicePoolABI from './ServicePool.json'
import TempVaultABI from './TempVault.json'
import VFIDEAccessControlABI from './VFIDEAccessControl.json'
import VFIDEEnterpriseGatewayABI from './VFIDEEnterpriseGateway.json'
import VFIDEPriceOracleABI from './VFIDEPriceOracle.json'
import VFIDEReentrancyGuardABI from './VFIDEReentrancyGuard.json'
import VaultRecoveryClaimABI from './VaultRecoveryClaim.json'
import DeployPhase1ABI from './DeployPhase1.json'
import DeployPhase1GovernanceABI from './DeployPhase1Governance.json'
import DeployPhase1InfrastructureABI from './DeployPhase1Infrastructure.json'
import DeployPhase1TokenABI from './DeployPhase1Token.json'
import DeployPhases3to6ABI from './DeployPhases3to6.json'
import PoolsABI from './Pools.json'
import SharedInterfacesABI from './SharedInterfaces.json'
import VFIDEFinanceABI from './VFIDEFinance.json'
import VFIDESecurityABI from './VFIDESecurity.json'
import VFIDETrustABI from './VFIDETrust.json'
import VFIDETermLoanABI from './VFIDETermLoan.json'
import VFIDEFlashLoanABI from './VFIDEFlashLoan.json'
import { logger } from '@/lib/logger';

const KNOWN_EMPTY_ABIS = new Set([
  'DeployPhase3Peripherals',
  'DeployPhase1',
  'DeployPhase1Governance',
  'DeployPhase1Infrastructure',
  'DeployPhase1Token',
  'DeployPhases3to6',
  'DevReserveVestingVault',
  'EcosystemVaultLib',
  'SeerAutonomousLib',
  'Pools',
  'SharedInterfaces',
  'VFIDEFinance',
  'VFIDESecurity',
  'VFIDETrust',
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
validateABI(UserVaultLiteABI, 'UserVaultLite');
validateABI(UserVaultABI, 'UserVault');
validateABI(CardBoundVaultABI, 'CardBoundVault');
validateABI(SeerABI, 'Seer');
validateABI(SeerAutonomousABI, 'SeerAutonomous');
validateABI(VFIDEBadgeNFTABI, 'VFIDEBadgeNFT');
validateABI(DAOABI, 'DAO');
validateABI(DAOTimelockABI, 'DAOTimelock');
validateABI(GuardianRegistryABI, 'GuardianRegistry');
validateABI(GuardianLockABI, 'GuardianLock');
validateABI(PanicGuardABI, 'PanicGuard');
validateABI(EmergencyBreakerABI, 'EmergencyBreaker');
validateABI(MerchantRegistryABI, 'MerchantRegistry');
validateABI(MerchantPortalABI, 'MerchantPortal');
validateABI(ProofScoreBurnRouterABI, 'ProofScoreBurnRouter');
validateABI(ProofLedgerABI, 'ProofLedger');
validateABI(CommerceEscrowABI, 'CommerceEscrow');
// Validate new ABIs
validateABI(BurnRouterABI, 'BurnRouter');
validateABI(DutyDistributorABI, 'DutyDistributor');
validateABI(CouncilElectionABI, 'CouncilElection');
validateABI(CouncilSalaryABI, 'CouncilSalary');
validateABI(SubscriptionManagerABI, 'SubscriptionManager');
validateABI(SanctumVaultABI, 'SanctumVault');
validateABI(DevReserveVestingABI, 'DevReserveVesting');
validateABI(PayrollManagerABI, 'PayrollManager');
validateABI(EcosystemVaultABI, 'EcosystemVault');
validateABI(EcosystemVaultViewABI, 'EcosystemVaultView');
validateABI(VaultRegistryABI, 'VaultRegistry');
validateABI(ERC20ABI, 'ERC20');
validateABI(SeerSocialABI, 'SeerSocial');
validateABI(SeerViewABI, 'SeerView');
validateABI(UserRewardsABI, 'UserRewards');
validateABI(OwnerControlPanelABI, 'OwnerControlPanel');
validateABI(EscrowManagerABI, 'EscrowManager');
validateABI(BadgeManagerABI, 'BadgeManager');
validateABI(FeeDistributorABI, 'FeeDistributor');
validateABI(SystemHandoverABI, 'SystemHandover');
validateABI(VFIDEBridgeABI, 'VFIDEBridge');
validateABI(AdminMultiSigABI, 'AdminMultiSig');
validateABI(CircuitBreakerABI, 'CircuitBreaker');
validateABI(EmergencyControlABI, 'EmergencyControl');
validateABI(WithdrawalQueueABI, 'WithdrawalQueue');
validateABI(VFIDEBenefitsABI, 'VFIDEBenefits');
validateABI(FraudRegistryABI, 'FraudRegistry');
validateABI(VFIDETestnetFaucetABI, 'VFIDETestnetFaucet');
validateABI(GovernanceHooksABI, 'GovernanceHooks');
validateABI(BadgeRegistryABI, 'BadgeRegistry');
validateABI(SeerGuardianABI, 'SeerGuardian');
validateABI(SeerPolicyGuardABI, 'SeerPolicyGuard');
validateABI(MainstreamPaymentsABI, 'MainstreamPayments');
validateABI(VFIDECommerceABI, 'VFIDECommerce');

validateABI(BadgeQualificationRulesABI, 'BadgeQualificationRules');

validateABI(BridgeSecurityModuleABI, 'BridgeSecurityModule');

validateABI(DeployPhase3PeripheralsABI, 'DeployPhase3Peripherals');

validateABI(DevReserveVestingVaultABI, 'DevReserveVestingVault');

validateABI(EcosystemVaultLibABI, 'EcosystemVaultLib');

validateABI(LiquidityIncentivesABI, 'LiquidityIncentives');

validateABI(RevenueSplitterABI, 'RevenueSplitter');

validateABI(SeerAutonomousLibABI, 'SeerAutonomousLib');

validateABI(SeerWorkAttestationABI, 'SeerWorkAttestation');

validateABI(ServicePoolABI, 'ServicePool');

validateABI(TempVaultABI, 'TempVault');

validateABI(VFIDEAccessControlABI, 'VFIDEAccessControl');

validateABI(VFIDEEnterpriseGatewayABI, 'VFIDEEnterpriseGateway');

validateABI(VFIDEPriceOracleABI, 'VFIDEPriceOracle');

validateABI(VFIDEReentrancyGuardABI, 'VFIDEReentrancyGuard');

validateABI(VaultRecoveryClaimABI, 'VaultRecoveryClaim');

validateABI(DeployPhase1ABI, 'DeployPhase1');

validateABI(DeployPhase1GovernanceABI, 'DeployPhase1Governance');

validateABI(DeployPhase1InfrastructureABI, 'DeployPhase1Infrastructure');

validateABI(DeployPhase1TokenABI, 'DeployPhase1Token');

validateABI(DeployPhases3to6ABI, 'DeployPhases3to6');

validateABI(PoolsABI, 'Pools');

validateABI(SharedInterfacesABI, 'SharedInterfaces');

validateABI(VFIDEFinanceABI, 'VFIDEFinance');

validateABI(VFIDESecurityABI, 'VFIDESecurity');

validateABI(VFIDETrustABI, 'VFIDETrust');

// VaultHub ABI — getVaultInfo/checkVaultStatus/predictVaultsBatch removed for size; use VaultRegistry.getVaultInfo instead.
validateABI(VaultHubFullABI, 'VaultHub');
const VaultHubABI = VaultHubFullABI

export {
  VFIDETokenABI,
  StablecoinRegistryABI,
  VaultInfrastructureABI,
  VaultHubABI,
  UserVaultLiteABI,
  UserVaultABI,
  CardBoundVaultABI,
  SeerABI,
  SeerAutonomousABI,
  VFIDEBadgeNFTABI,
  DAOABI,
  DAOTimelockABI,
  GuardianRegistryABI,
  GuardianLockABI,
  PanicGuardABI,
  EmergencyBreakerABI,
  MerchantRegistryABI,
  MerchantPortalABI,
  ProofScoreBurnRouterABI,
  ProofLedgerABI,
  CommerceEscrowABI,
  // New consolidated exports
  BurnRouterABI,
  DutyDistributorABI,
  CouncilElectionABI,
  CouncilSalaryABI,
  SubscriptionManagerABI,
  SanctumVaultABI,
  DevReserveVestingABI,
  PayrollManagerABI,
  EcosystemVaultABI,
  EcosystemVaultViewABI,
  VaultRegistryABI,
  ERC20ABI,
  SeerSocialABI,
  SeerViewABI,
  UserRewardsABI,
  OwnerControlPanelABI,
  EscrowManagerABI,
  BadgeManagerABI,
  FeeDistributorABI,
  SystemHandoverABI,
  VFIDEBridgeABI,
  AdminMultiSigABI,
  CircuitBreakerABI,
  EmergencyControlABI,
  WithdrawalQueueABI,
  VFIDEBenefitsABI,
  FraudRegistryABI,
  VFIDETestnetFaucetABI,
  GovernanceHooksABI,
  BadgeRegistryABI,
  SeerGuardianABI,
  SeerPolicyGuardABI,
  MainstreamPaymentsABI,
  VFIDECommerceABI,
  BadgeQualificationRulesABI,
  BridgeSecurityModuleABI,
  DeployPhase3PeripheralsABI,
  DevReserveVestingVaultABI,
  EcosystemVaultLibABI,
  LiquidityIncentivesABI,
  RevenueSplitterABI,
  SeerAutonomousLibABI,
  SeerWorkAttestationABI,
  ServicePoolABI,
  TempVaultABI,
  VFIDEAccessControlABI,
  VFIDEEnterpriseGatewayABI,
  VFIDEPriceOracleABI,
  VFIDEReentrancyGuardABI,
  VaultRecoveryClaimABI,
  DeployPhase1ABI,
  DeployPhase1GovernanceABI,
  DeployPhase1InfrastructureABI,
  DeployPhase1TokenABI,
  DeployPhases3to6ABI,
  PoolsABI,
  SharedInterfacesABI,
  VFIDEFinanceABI,
  VFIDESecurityABI,
  VFIDETrustABI,
  VFIDETermLoanABI,
  VFIDEFlashLoanABI,
}
