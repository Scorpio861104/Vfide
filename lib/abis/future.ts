// Future/deferred contract ABIs.
// Keep these separated from the main ABI surface to reduce accidental use in
// production paths where future features are disabled.

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
