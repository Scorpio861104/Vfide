# Production Contract Set

Authoritative inventory for the current `contracts/` tree. This replaces stale references to deleted contracts such as `PromotionalTreasury.sol`, `UserVault.sol`, and `VFIDEPresale.sol`.

## Deployable Contracts

- AdminMultiSig.sol
- CardBoundVault.sol
- CircuitBreaker.sol
- DAO.sol
- DAOTimelock.sol
- DeployPhase3Peripherals.sol
- DevReserveVestingVault.sol
- DutyDistributor.sol
- EcosystemVault.sol
- EmergencyControl.sol
- EscrowManager.sol
- FeeDistributor.sol
- FraudRegistry.sol
- GovernanceHooks.sol
- LiquidityIncentives.sol
- MerchantPortal.sol
- OwnerControlPanel.sol
- PayrollManager.sol
- pools/DAOPayrollPool.sol
- pools/MerchantCompetitionPool.sol
- pools/HeadhunterCompetitionPool.sol
- ProofLedger.sol
- ProofScoreBurnRouter.sol
- RevenueSplitter.sol
- SanctumVault.sol
- Seer.sol
- ServicePool.sol
- StablecoinRegistry.sol
- SystemHandover.sol
- VFIDEAccessControl.sol
- VFIDECommerce.sol
- VFIDEFinance.sol
- VFIDEFlashLoan.sol
- VFIDEPriceOracle.sol
- VFIDESecurity.sol
- VFIDETermLoan.sol
- VFIDEToken.sol
- VaultHub.sol
- VaultInfrastructure.sol
- VaultRecoveryClaim.sol
- VaultRegistry.sol

## Support Libraries And Views

- EcosystemVaultLib.sol
- EcosystemVaultView.sol
- SharedInterfaces.sol

## Interfaces

- interfaces/AggregatorV3Interface.sol
- interfaces/ICommerceEscrow.sol
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
- package.json
- package-lock.json
