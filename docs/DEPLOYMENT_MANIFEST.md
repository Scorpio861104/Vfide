# VFIDE Contract Deployment Manifest

This document maps every production Solidity contract to its deployment mechanism.

## Deployment Mechanisms

| Mechanism | Script | Description |
|-----------|--------|-------------|
| **deploy-solo** | `scripts/deploy-solo.ts` | 9 core contracts + post-deploy wiring |
| **phase-1** | `scripts/deploy-phase1.ts` | Access control, token, governance via factory deployers |
| **phase-3** | `scripts/deploy-phase3.ts` | Bridge and peripherals via factory deployers |
| **factory** | Deployed by Phase1/Phase3 factory contracts | Sub-deployed on-chain |
| **deploy-wizard** | `scripts/deploy-wizard.sh` | Interactive wrapper around deploy-solo |
| **manual** | Owner calls after core deploy | Wired by OwnerControlPanel or direct calls |
| **deferred** | Not yet needed | Will be deployed when feature is activated |

## Core Contracts (deploy-solo.ts)

| Contract | Constructor Args | Notes |
|----------|-----------------|-------|
| VFIDEToken | (treasury) | ERC-20 with supply cap |
| ProofLedger | (vfide, seer) | Scoring engine |
| SecurityHub | (vfide) | Security coordinator |
| VaultHub | (vfide, proofLedger, securityHub) | Vault registry |
| DevReserveVestingVault | (vfide, beneficiary) | 5yr vesting, 60-day cliff |
| Seer | (vfide) | Oracle coordinator |
| ProofScoreBurnRouter | (vfide, proofLedger) | Conditional deploy |
| OwnerControlPanel | (all deployed addresses) | Admin dashboard |
| SystemHandover | (all deployed addresses) | Ownership transfer |

## Phase 1 Factory Contracts (deploy-phase1.ts)

| Deployer | Sub-deploys | Notes |
|----------|-------------|-------|
| Phase1TokenDeployer | VFIDEToken, VFIDEAccessControl | Token + access control |
| Phase1GovernanceDeployer | AdminMultiSig, EmergencyControl | Governance primitives |
| Phase1InfrastructureDeployer | CircuitBreaker, WithdrawalQueueStub | Safety infrastructure |

## Phase 3 Factory Contracts (deploy-phase3.ts)

| Deployer | Sub-deploys | Notes |
|----------|-------------|-------|
| DeployPhase3Peripherals | BridgeSecurityModule, VFIDEPriceOracle | Bridge prerequisites |
| DeployPhase3 | VFIDEBridge | Cross-chain bridge |

## Post-Deploy Contracts (deployed by owner after core)

These contracts are deployed separately after core infrastructure is live, then wired via `OwnerControlPanel` or direct `transferOwnership()` calls.

| Contract | Depends On | Deploy Order |
|----------|-----------|-------------|
| StablecoinRegistry | — | Anytime |
| DAO | VFIDEToken | After token |
| DAOTimelock | DAO | After DAO |
| VFIDEBadgeNFT | — | Anytime |
| GuardianRegistry | SecurityHub | After SecurityHub |
| GuardianLock | GuardianRegistry | After GuardianRegistry |
| PanicGuard | SecurityHub | After SecurityHub |
| EmergencyBreaker | SecurityHub | After SecurityHub |
| SeerAutonomous | Seer | After Seer |
| SeerGuardian | Seer | After Seer |
| SeerView | Seer | After Seer |
| SeerSocial | Seer | After Seer |
| EcosystemVault | VFIDEToken | After token |
| MerchantPortal | VFIDEToken, ProofLedger | After token + ProofLedger |
| MerchantRegistry | — | With MerchantPortal |
| CommerceEscrow | MerchantPortal | After MerchantPortal |
| CardBoundVault | VaultHub | After VaultHub |
| VaultInfrastructure | VaultHub | After VaultHub |
| VaultRegistry | VaultHub | After VaultHub |
| SanctumVault | VFIDEToken | After token |
| BurnRouter | VFIDEToken, ProofLedger | After both |
| DutyDistributor | VFIDEToken | After token |
| CouncilElection | VFIDEToken | After token |
| CouncilSalary | CouncilElection | After CouncilElection |
| CouncilManager | CouncilElection | After CouncilElection |
| SubscriptionManager | VFIDEToken | After token |
| PayrollManager | VFIDEToken | After token |
| EscrowManager | — | With CommerceEscrow |
| BadgeManager | VFIDEBadgeNFT | After BadgeNFT |
| LiquidityIncentives | VFIDEToken | After token |
| FeeDistributor | VFIDEToken | After token |
| UserRewards | VFIDEToken | After token |

## Intentionally Deferred Contracts

These are not deployed until the feature is activated post-launch:

| Contract | Reason |
|----------|--------|
| VFIDEBridge | Phase 3 — bridge feature |
| BridgeSecurityModule | Phase 3 prerequisite |
| VFIDEPriceOracle | Phase 3 prerequisite |
| VFIDEEnterpriseGateway | Enterprise feature |
| MainstreamPayments (all 5) | Mainstream fiat ramp feature |
| TempVault | Developer testing only |
| VFIDEReentrancyGuard | Base class, not deployed standalone |
| GovernanceHooks | Abstract/base, not deployed standalone |
| VFIDEBenefits | Benefits distribution feature |
| VFIDEFinance (all nested) | Finance module feature |
| RevenueSplitter | Revenue-sharing feature |
| SeerWorkAttestation | Work proof feature |
| SeerPolicyGuard | Policy enforcement feature |
| BadgeQualificationRules | Badge rule engine |
| VaultRecoveryClaim | Vault recovery feature |
| Pools (DAOPayrollPool, etc.) | Pool contracts for competitions |

## Deployment Verification

After deployment, verify all contracts using:

```bash
# Verify on block explorer
npx hardhat verify --network baseSepolia <address> <constructor-args>

# Or verify all at once (if addresses are in .env)
npx hardhat run scripts/verify-all.ts --network baseSepolia
```
