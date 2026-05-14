# Production Contract Set

Authoritative inventory for the current `contracts/` tree. This replaces stale
references to deleted contracts such as `PromotionalTreasury.sol`,
`UserVault.sol`, and `VFIDEPresale.sol`.

## Deployable Contracts

These contracts are deployed directly by the deploy scripts and need their
own Etherscan source verification on mainnet.

- AdminMultiSig.sol
- CardBoundVault.sol
- CircuitBreaker.sol                  ← *see V1 Mainnet Deploy Status below*
- DAO.sol
- DAOTimelock.sol
- DevReserveVestingVault.sol
- DutyDistributor.sol                 ← *see V1 Mainnet Deploy Status below*
- EcosystemVault.sol
- EmergencyControl.sol
- EscrowManager.sol                   ← *see V1 Mainnet Deploy Status below*
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
- RevenueSplitter.sol                 ← *see V1 Mainnet Deploy Status below*
- SanctumVault.sol
- Seer.sol
- StablecoinRegistry.sol              ← *see V1 Mainnet Deploy Status below*
- SystemHandover.sol
- VFIDEAccessControl.sol              ← base contract; deployed implicitly as parent of others, not standalone
- VFIDECommerce.sol                   ← aliased to MerchantRegistry in deploy-full.ts Layer 11
- VFIDEFinance.sol                    ← **file contains `EcoTreasuryVault`, not a `VFIDEFinance` contract** (rename pending)
- VFIDEFlashLoan.sol
- VFIDEPriceOracle.sol
- VFIDETermLoan.sol
- VFIDEToken.sol
- VaultHub.sol
- VaultInfrastructure.sol             ← *see V1 Mainnet Deploy Status below*
- VaultRecoveryClaim.sol
- VaultRegistry.sol

## Support Libraries And Views

- EcosystemVaultLib.sol         (Solidity library; deployed implicitly when linked)
- EcosystemVaultView.sol        (read-only view contract; deployed standalone)
- ServicePool.sol               (abstract base; the concrete subclasses `pools/DAOPayrollPool.sol`, `pools/MerchantCompetitionPool.sol`, and `pools/HeadhunterCompetitionPool.sol` listed above are the deployable ones)
- SharedInterfaces.sol          (interfaces + ownership-transfer primitive used by other contracts)

## Spawned By Other Contracts (Not Standalone)

These contracts are NOT deployed by the deploy scripts. They are spawned by
the constructors of other contracts and live at on-chain addresses derived
from the spawning contract's deploy. They MUST still be compiled and shipped
with the deploy artifacts so the spawning `new <Module>(address(this), …)`
calls succeed.

- **`CardBoundVaultDeployer.sol`**
  Spawned by `VaultHub`'s constructor (see `VaultHub.sol:135`,
  `vaultDeployer = new CardBoundVaultDeployer()`). The deployer becomes
  `vaultHub = msg.sender` (immutable). One instance exists per `VaultHub`
  deployment.

- **Per-vault auxiliary modules** — each new `CardBoundVault` instance spawns
  these in its constructor (see `CardBoundVault.sol:463-470`). They live at
  deterministic addresses derived from the parent vault and require
  per-vault-instance Etherscan source verification.
  - `CardBoundVaultAdminManager.sol`
  - `CardBoundVaultInheritanceManager.sol`
  - `CardBoundVaultPaymentQueueManager.sol`
  - `CardBoundVaultWithdrawalQueueManager.sol`

## V1 Mainnet Deploy Status

The contracts listed above as "Deployable" are intended for mainnet, but the
canonical deploy script `scripts/deploy-full.ts` does not currently deploy
all of them. The gap, with the status of each as of this writing:

| Contract | In deploy-full.ts? | Notes |
|---|---|---|
| `VFIDEPriceOracle` | **YES (added 2026-05-14)** | Layer 6, inline. `ARGS_VFIDEPRICEORACLE` env supplies remaining 4 ctor args. Replaces the BSM-tangled `DeployPhase3Peripherals.deployPeripherals()` helper. |
| `StablecoinRegistry` | **NO** | Token allowlist for `MerchantPortal`/`CommerceEscrow`. Almost certainly needed at V1 — needs adding before mainnet. |
| `CircuitBreaker` | **NO** | Concrete (extends `VFIDEAccessControl`). Decision needed: V1 mainnet or deferred. |
| `DutyDistributor` | **NO** | Concrete `IGovernanceHooks` implementation. Decision needed. |
| `EscrowManager` | **NO** | Concrete. Possibly superseded by `CommerceEscrow` (which IS deployed at Layer 11). Confirm before removing or adding. |
| `RevenueSplitter` | **NO** | Concrete. Decision needed. |
| `VaultInfrastructure` | **NO** | Concrete (`Ownable`). Decision needed. |
| `VFIDEAccessControl` | n/a | Base contract; deployed implicitly as a parent of others. Not standalone. |
| `VFIDEFinance` | n/a | File contains `EcoTreasuryVault`, not a contract named `VFIDEFinance`. File or entry should be renamed. |
| `DeployPhase3Peripherals` | n/a for V1 | Helper that also pulls in `contracts/future/BridgeSecurityModule.sol`. Deferred — V1 uses the inline `VFIDEPriceOracle` deploy in Layer 6 instead. |

**Action before mainnet:** Vanta confirms each "Decision needed" row as
either *deploy at V1* (add to `deploy-full.ts`), *defer* (move under
`contracts/future/`), or *legacy* (remove from this list).

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

## Legacy / Not Deployed To Mainnet

- `legacy/VFIDESecurity.sol` — kept in `contracts/legacy/` for the
  `EmergencyBreaker` reference comment in `EmergencyControl.sol:15`. Not
  deployed at V1.
- `legacy/SharedInterfaces.sol` — superseded by the canonical
  `contracts/SharedInterfaces.sol`.

## Excluded From Production Set

- contracts/future/**     (Bridge, MainstreamPayments, Seer satellite contracts, Council, etc.)
- contracts/legacy/**
- contracts/mocks/**
- contracts/security/**   (test helpers — not deployed)
- scripts/**
- package.json
- package-lock.json
