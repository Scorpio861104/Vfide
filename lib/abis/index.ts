// Auto-generated contract ABIs
// Run: ./scripts/generate-abis.sh to regenerate

import VFIDETokenABI from './VFIDEToken.json'
import VFIDEPresaleABI from './VFIDEPresale.json'
import StablecoinRegistryABI from './StablecoinRegistry.json'
import VaultInfrastructureABI from './VaultInfrastructure.json'
import VaultHubLiteABI from './VaultHubLite.json'
import UserVaultLiteABI from './UserVaultLite.json'
import UserVaultABI from './UserVault.json'
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

// Runtime validation: Ensure ABIs are valid arrays
function validateABI(abi: unknown, name: string): any[] {
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
validateABI(VaultHubLiteABI, 'VaultHubLite');
validateABI(UserVaultLiteABI, 'UserVaultLite');
validateABI(UserVaultABI, 'UserVault');
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

// VaultHub ABI - use VaultInfrastructure for full features
const VaultHubABI = VaultInfrastructureABI

export {
  VFIDETokenABI,
  VFIDEPresaleABI,
  StablecoinRegistryABI,
  VaultInfrastructureABI,
  VaultHubABI,
  VaultHubLiteABI,
  UserVaultLiteABI,
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
}
