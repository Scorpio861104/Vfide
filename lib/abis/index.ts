// Auto-generated contract ABIs
// Run: ./scripts/generate-abis.sh to regenerate

import type { Abi } from 'viem'
import VFIDETokenABIJson from './VFIDEToken.json'
import VFIDEPresaleABIJson from './VFIDEPresale.json'
import StablecoinRegistryABIJson from './StablecoinRegistry.json'
import VaultInfrastructureABIJson from './VaultInfrastructure.json'
import UserVaultABIJson from './UserVault.json'
import SeerABIJson from './Seer.json'
import VFIDEBadgeNFTABIJson from './VFIDEBadgeNFT.json'
import DAOABIJson from './DAO.json'
import DAOTimelockABIJson from './DAOTimelock.json'
import SecurityHubABIJson from './SecurityHub.json'
import GuardianRegistryABIJson from './GuardianRegistry.json'
import GuardianLockABIJson from './GuardianLock.json'
import PanicGuardABIJson from './PanicGuard.json'
import EmergencyBreakerABIJson from './EmergencyBreaker.json'
import MerchantRegistryABIJson from './MerchantRegistry.json'
import MerchantPortalABIJson from './MerchantPortal.json'
import ProofScoreBurnRouterABIJson from './ProofScoreBurnRouter.json'
import ProofLedgerABIJson from './ProofLedger.json'
import CommerceEscrowABIJson from './CommerceEscrow.json'
// New consolidated ABIs
import BurnRouterABIJson from './BurnRouter.json'
import DutyDistributorABIJson from './DutyDistributor.json'
import PromotionalTreasuryABIJson from './PromotionalTreasury.json'
import CouncilElectionABIJson from './CouncilElection.json'
import CouncilSalaryABIJson from './CouncilSalary.json'
import SubscriptionManagerABIJson from './SubscriptionManager.json'
import SanctumVaultABIJson from './SanctumVault.json'
import DevReserveVestingABIJson from './DevReserveVesting.json'
import PayrollManagerABIJson from './PayrollManager.json'
import EcosystemVaultABIJson from './EcosystemVault.json'
import VaultRegistryABIJson from './VaultRegistry.json'
import ERC20ABIJson from './ERC20.json'

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

// Validate and normalize all imported ABIs
const VFIDETokenABI = validateABI(VFIDETokenABIJson, 'VFIDEToken') as Abi;
const VFIDEPresaleABI = validateABI(VFIDEPresaleABIJson, 'VFIDEPresale') as Abi;
const StablecoinRegistryABI = validateABI(StablecoinRegistryABIJson, 'StablecoinRegistry') as Abi;
const VaultInfrastructureABI = validateABI(VaultInfrastructureABIJson, 'VaultInfrastructure') as Abi;
const UserVaultABI = validateABI(UserVaultABIJson, 'UserVault') as Abi;
const SeerABI = validateABI(SeerABIJson, 'Seer') as Abi;
const VFIDEBadgeNFTABI = validateABI(VFIDEBadgeNFTABIJson, 'VFIDEBadgeNFT') as Abi;
const DAOABI = validateABI(DAOABIJson, 'DAO') as Abi;
const DAOTimelockABI = validateABI(DAOTimelockABIJson, 'DAOTimelock') as Abi;
const SecurityHubABI = validateABI(SecurityHubABIJson, 'SecurityHub') as Abi;
const GuardianRegistryABI = validateABI(GuardianRegistryABIJson, 'GuardianRegistry') as Abi;
const GuardianLockABI = validateABI(GuardianLockABIJson, 'GuardianLock') as Abi;
const PanicGuardABI = validateABI(PanicGuardABIJson, 'PanicGuard') as Abi;
const EmergencyBreakerABI = validateABI(EmergencyBreakerABIJson, 'EmergencyBreaker') as Abi;
const MerchantRegistryABI = validateABI(MerchantRegistryABIJson, 'MerchantRegistry') as Abi;
const MerchantPortalABI = validateABI(MerchantPortalABIJson, 'MerchantPortal') as Abi;
const ProofScoreBurnRouterABI = validateABI(ProofScoreBurnRouterABIJson, 'ProofScoreBurnRouter') as Abi;
const ProofLedgerABI = validateABI(ProofLedgerABIJson, 'ProofLedger') as Abi;
const CommerceEscrowABI = validateABI(CommerceEscrowABIJson, 'CommerceEscrow') as Abi;
// Validate new ABIs
const BurnRouterABI = validateABI(BurnRouterABIJson, 'BurnRouter') as Abi;
const DutyDistributorABI = validateABI(DutyDistributorABIJson, 'DutyDistributor') as Abi;
const PromotionalTreasuryABI = validateABI(PromotionalTreasuryABIJson, 'PromotionalTreasury') as Abi;
const CouncilElectionABI = validateABI(CouncilElectionABIJson, 'CouncilElection') as Abi;
const CouncilSalaryABI = validateABI(CouncilSalaryABIJson, 'CouncilSalary') as Abi;
const SubscriptionManagerABI = validateABI(SubscriptionManagerABIJson, 'SubscriptionManager') as Abi;
const SanctumVaultABI = validateABI(SanctumVaultABIJson, 'SanctumVault') as Abi;
const DevReserveVestingABI = validateABI(DevReserveVestingABIJson, 'DevReserveVesting') as Abi;
const PayrollManagerABI = validateABI(PayrollManagerABIJson, 'PayrollManager') as Abi;
const EcosystemVaultABI = validateABI(EcosystemVaultABIJson, 'EcosystemVault') as Abi;
const VaultRegistryABI = validateABI(VaultRegistryABIJson, 'VaultRegistry') as Abi;
const ERC20ABI = validateABI(ERC20ABIJson, 'ERC20') as Abi;

// VaultHub ABI - use VaultInfrastructure for full features
const VaultHubABI = VaultInfrastructureABI

export {
  VFIDETokenABI,
  VFIDEPresaleABI,
  StablecoinRegistryABI,
  VaultInfrastructureABI,
  VaultHubABI,
  UserVaultABI,
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
  PromotionalTreasuryABI,
  CouncilElectionABI,
  CouncilSalaryABI,
  SubscriptionManagerABI,
  SanctumVaultABI,
  DevReserveVestingABI,
  PayrollManagerABI,
  EcosystemVaultABI,
  VaultRegistryABI,
  ERC20ABI,
}
