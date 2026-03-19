// Auto-generated contract ABIs
// Run: ./scripts/generate-abis.sh to regenerate

import VFIDETokenABI from './VFIDEToken.json'
import VFIDEPresaleABI from './VFIDEPresale.json'
import StablecoinRegistryABI from './StablecoinRegistry.json'
import VaultInfrastructureABI from './VaultInfrastructure.json'
import VaultHubFullABI from './VaultHub.json'
import VaultHubLiteABI from './VaultHubLite.json'
import UserVaultLiteABI from './UserVaultLite.json'
import UserVaultABI from './UserVault.json'
import CardBoundVaultABI from './CardBoundVault.json'
import SeerABI from './Seer.json'
import VFIDEBadgeNFTABI from './VFIDEBadgeNFT.json'
import DAOABI from './DAO.json'
import DAOTimelockABI from './DAOTimelock.json'
import SecurityHubABI from './SecurityHub.json'
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
import EcosystemVaultABI from './EcosystemVault.json'
import VaultRegistryABI from './VaultRegistry.json'
import ERC20ABI from './ERC20.json'
import SeerSocialABI from './SeerSocial.json'
import SeerViewABI from './SeerView.json'
import UserRewardsABI from './UserRewards.json'
import PromotionalTreasuryABI from './PromotionalTreasury.json'

// Runtime validation: Ensure ABIs are valid arrays
function validateABI(abi: unknown, name: string): unknown[] {
  if (!Array.isArray(abi)) {
    throw new Error(`Invalid ABI for ${name}: Expected array, got ${typeof abi}`);
  }
  if (abi.length === 0) {
    console.warn(`[VFIDE] Warning: Empty ABI for ${name}`);
  }
  return abi;
}

// Validate all imported ABIs
validateABI(VFIDETokenABI, 'VFIDEToken');
validateABI(VFIDEPresaleABI, 'VFIDEPresale');
validateABI(StablecoinRegistryABI, 'StablecoinRegistry');
validateABI(VaultInfrastructureABI, 'VaultInfrastructure');
validateABI(UserVaultLiteABI, 'UserVaultLite');
validateABI(UserVaultABI, 'UserVault');
validateABI(CardBoundVaultABI, 'CardBoundVault');
validateABI(SeerABI, 'Seer');
validateABI(VFIDEBadgeNFTABI, 'VFIDEBadgeNFT');
validateABI(DAOABI, 'DAO');
validateABI(DAOTimelockABI, 'DAOTimelock');
validateABI(SecurityHubABI, 'SecurityHub');
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
validateABI(VaultRegistryABI, 'VaultRegistry');
validateABI(ERC20ABI, 'ERC20');
validateABI(SeerSocialABI, 'SeerSocial');
validateABI(SeerViewABI, 'SeerView');
validateABI(UserRewardsABI, 'UserRewards');
validateABI(PromotionalTreasuryABI, 'PromotionalTreasury');

// VaultHub ABI points to the full compiled artifact (includes ensureVault, getVaultInfo, etc.).
validateABI(VaultHubFullABI, 'VaultHub');
const VaultHubABI = VaultHubFullABI

export {
  VFIDETokenABI,
  VFIDEPresaleABI,
  StablecoinRegistryABI,
  VaultInfrastructureABI,
  VaultHubABI,
  VaultHubLiteABI,
  UserVaultLiteABI,
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
  VaultRegistryABI,
  ERC20ABI,
  SeerSocialABI,
  SeerViewABI,
  UserRewardsABI,
  PromotionalTreasuryABI,
}
