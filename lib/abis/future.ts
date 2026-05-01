// Future/deferred contract ABIs.
// Keep these separated from the main ABI surface to reduce accidental use in
// production paths where future features are disabled.

if (
  typeof process !== 'undefined' &&
  process.env.NODE_ENV === 'production' &&
  process.env.NEXT_PUBLIC_FUTURE_FEATURES_ENABLED !== 'true'
) {
  // Importing future ABIs with the feature flag off indicates an accidental production dependency.
  console.error('[future ABIs] imported in production with NEXT_PUBLIC_FUTURE_FEATURES_ENABLED!=true')
}

import SeerAutonomousABI from './SeerAutonomous.json'
import VFIDEBadgeNFTABI from './VFIDEBadgeNFT.json'
import CouncilElectionABI from './CouncilElection.json'
import CouncilSalaryABI from './CouncilSalary.json'
import SubscriptionManagerABI from './SubscriptionManager.json'
import VFIDECommerceABI from './VFIDECommerce.json'

export {
  SeerAutonomousABI,
  VFIDEBadgeNFTABI,
  CouncilElectionABI,
  CouncilSalaryABI,
  SubscriptionManagerABI,
  VFIDECommerceABI,
}
