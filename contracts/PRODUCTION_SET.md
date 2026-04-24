# Production Contract Set

Authoritative inventory for the current `contracts/` tree. This replaces stale references to deleted contracts such as `PromotionalTreasury.sol`, `UserVault.sol`, and `VFIDEPresale.sol`.

## Deployable Contracts

- AdminMultiSig.sol
- BadgeManager.sol
- BadgeQualificationRules.sol
- BadgeRegistry.sol
- BridgeSecurityModule.sol
- CardBoundVault.sol
- CircuitBreaker.sol
- CouncilElection.sol
- CouncilManager.sol
- CouncilSalary.sol
- DAO.sol
- DAOTimelock.sol
- DeployPhase1.sol
- DeployPhase1Governance.sol
- DeployPhase1Infrastructure.sol
- DeployPhase1Token.sol
- DeployPhase3Peripherals.sol
- DeployPhases3to6.sol
- DevReserveVestingVault.sol
- DutyDistributor.sol
- EcosystemVault.sol
- EmergencyControl.sol
- EscrowManager.sol
- FeeDistributor.sol
- FraudRegistry.sol
- GovernanceHooks.sol
- LiquidityIncentives.sol
- MainstreamPayments.sol
- MerchantPortal.sol
- OwnerControlPanel.sol
- PayrollManager.sol
- Pools.sol
- ProofLedger.sol
- ProofScoreBurnRouter.sol
- RevenueSplitter.sol
- SanctumVault.sol
- Seer.sol
- SeerAutonomous.sol
- SeerGuardian.sol
- SeerSocial.sol
- SeerWorkAttestation.sol
- ServicePool.sol
- StablecoinRegistry.sol
- SubscriptionManager.sol
- SystemHandover.sol
- VFIDEAccessControl.sol
- VFIDEBadgeNFT.sol
- VFIDEBenefits.sol
- VFIDEBridge.sol
- VFIDECommerce.sol
- VFIDEEnterpriseGateway.sol
- VFIDEFinance.sol
- VFIDEFlashLoan.sol
- VFIDEPriceOracle.sol
- VFIDEReentrancyGuard.sol
- VFIDESecurity.sol
- VFIDETermLoan.sol
- VFIDETestnetFaucet.sol
- VFIDEToken.sol
- VFIDETrust.sol
- VaultHub.sol
- VaultInfrastructure.sol
- VaultRecoveryClaim.sol
- VaultRegistry.sol
- WithdrawalQueue.sol

## Support Libraries And Views

- EcosystemVaultLib.sol
- EcosystemVaultView.sol
- SeerAutonomousLib.sol
- SeerPolicyGuard.sol
- SeerView.sol
- SharedInterfaces.sol

## Interfaces

- interfaces/AggregatorV3Interface.sol
- interfaces/ICommerceEscrow.sol
- interfaces/ICouncilElection.sol
- interfaces/IDAO.sol
- interfaces/IDAOTimelock.sol
- interfaces/IDevReserveVestingVault.sol
- interfaces/IERC20Minimal.sol
- interfaces/IEcoTreasuryVault.sol
- interfaces/IEmergencyBreaker.sol
- interfaces/IEmergencyControl.sol
- interfaces/IGovernanceHooks.sol
- interfaces/IGuardianLock.sol
- interfaces/IGuardianRegistry.sol
- interfaces/IMerchantRegistry.sol
- interfaces/IPanicGuard.sol
- interfaces/IProofLedger.sol
- interfaces/IProofScoreBurnRouter.sol
- interfaces/IReviewRegistry.sol
- interfaces/ISanctumFund.sol
- interfaces/ISecurityHub.sol
- interfaces/ISeer.sol
- interfaces/IStablecoinRegistry.sol
- interfaces/ISystemHandover.sol
- interfaces/IVFIDEToken.sol
- interfaces/IVaultFactory.sol
- interfaces/IVaultHub.sol
- interfaces/IVaultInfrastructure.sol

## Excluded From Production Set

- mocks/**
- security/**
- scripts/**
- TempVault.sol (developer testing utility only; do not route production funds)
- package.json
- package-lock.json
