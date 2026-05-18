# Production Contract Set

Authoritative inventory for the current `contracts/` tree. This replaces stale
references to deleted contracts such as `PromotionalTreasury.sol`,
`UserVault.sol`, and `VFIDEPresale.sol`.

## Deployable Contracts

These contracts are deployed directly by the deploy scripts and need their
own Etherscan source verification on mainnet.

- AdminMultiSig.sol
- CardBoundVault.sol
- DAO.sol
- DAOTimelock.sol
- DevReserveVestingVault.sol
- EcosystemVault.sol
- EmergencyControl.sol
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
- RevenueSplitter.sol                 ← user-deployable template (each merchant deploys their own instance); not a bootstrap singleton
- SanctumVault.sol
- Seer.sol
- SystemHandover.sol
- VFIDEAccessControl.sol              ← base contract; deployed implicitly as parent of others, not standalone
- VFIDECommerce.sol                   ← aliased to MerchantRegistry in deploy-full.ts Layer 11
- EcoTreasuryVault.sol                ← renamed from `VFIDEFinance.sol` 2026-05-16 to match contract name inside
- VFIDEFlashLoan.sol
- VFIDEPriceOracle.sol
- VFIDETermLoan.sol
- VFIDEToken.sol
- VaultHub.sol
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
| `CardBoundVaultDeployer` | **YES (implicit)** | Constructor-spawned by `VaultHub` (`VaultHub.sol:135`, `vaultDeployer = new CardBoundVaultDeployer()`). One instance per VaultHub deployment. Always deployed alongside VaultHub. Original flag as "missing" was a false positive in the 2026-05-14 audit. |
| `EscrowManager` | **REMOVED 2026-05-15** | Superseded by `CommerceEscrow` (deployed at Layer 11). createEscrow was a revert stub (ESC_Deprecated); the contract was effectively unreachable since no function populated the `escrows` mapping. Deleted in Phase 3e turn 1. Restorable from git if a high-value/arbiter-based escrow product is needed later. |
| `CircuitBreaker` | **MOVED TO `contracts/legacy/` 2026-05-16** | V1's actual circuit breaker is the token-level boolean flag `VFIDEToken.setCircuitBreaker(bool, uint256)` — that's what the UI (AdminDashboardClient, EmergencyPanel) calls. This standalone monitoring contract had no production callers in V1 (`recordVolume` / `recordSuspiciousActivity` were only invoked from test files). Retained in legacy for reference and potential reactivation if metric-driven auto-pause is added later. |
| `DutyDistributor` | **DEFERRED TO FUTURE 2026-05-16** | Howey-compliant participation tracker, alternative `IGovernanceHooks` implementation. DAO can only wire one hooks contract; V1 keeps the already-deployed GovernanceHooks. Deploying DutyDistributor without wiring it as the DAO's hooks would be inert. Swapping out hooks is its own architectural change with design review, not a Tier-1-mainnet-prep decision. Frontend marketing copy in `HoweySafeModePanel` + `ProductionSetupPanel` trimmed to reflect V1 state. Re-enable in a future phase if/when Howey-safe participation tracking goes live. |
| `RevenueSplitter` | **USER-DEPLOYABLE TEMPLATE (no bootstrap deploy needed)** | Not a singleton — each merchant deploys their own instance with their own payee config. `MerchantPortal.sol:875` references it as an example integration ("e.g. RevenueSplitter or Treasury"). Same pattern as `CardBoundVault` (deployed per-user by a factory). Stays in production_set as a shipped, compiled template; not added to `deploy-full.ts`. |
| `StablecoinRegistry` | **DEFERRED TO FUTURE 2026-05-16** | V1 is VFIDE-only by architectural decision (see `EcoTreasuryVault.sol` header: "No stablecoin registry (VFIDE is the only currency)"). API routes in `app/api/merchant/payments/confirm/route.ts` and `withdraw/route.ts` already gracefully degrade when `CONTRACT_ADDRESSES.StablecoinRegistry` is unconfigured. Deploy as part of the future multi-stablecoin product launch, not as a quiet bootstrap deploy. Frontend ABI + env var key retained in `lib/contracts.ts` for forward compatibility. |
| `VaultInfrastructure` | **MOVED TO `contracts/legacy/` 2026-05-16** | The file's M-21 Architecture Note already self-documented that CardBoundVault + VaultHub had superseded UserVaultLegacy. Confirmed at move time: VaultHub provides all three lookup functions `VaultRegistry` needs (`vaultOf`, `ownerOfVault`, `isVault`) via auto-generated getters on its public mappings, and is already in active use for those calls by `FraudRegistry`, `VFIDETermLoan`, and `VaultRecoveryClaim`. The deprecated force-recovery functions in `IVaultInfrastructure` are non-custodial-removed and aren't called by V1 paths. Retained in legacy for reference / backward-compat with any pre-existing UserVaultLegacy deployments. |
| `VFIDEAccessControl` | n/a | Base contract; deployed implicitly as a parent of others. Not standalone. |
| `EcoTreasuryVault` (formerly `VFIDEFinance.sol`) | n/a — file/contract name dissonance resolved 2026-05-16 | File renamed from `VFIDEFinance.sol` to `EcoTreasuryVault.sol` so file and contract names match. Build scripts (`build-contracts.sh`, `run-mythril.sh`), test files, and source-read assertions updated to match. Tests already used `getContractFactory("EcoTreasuryVault")` so functional behavior is unchanged. |
| `DeployPhase3Peripherals` | n/a for V1 | Helper that also pulls in `contracts/future/BridgeSecurityModule.sol`. Deferred — V1 uses the inline `VFIDEPriceOracle` deploy in Layer 6 instead. |

**Operations Phase Turn 4 closure (2026-05-16):** All 10 contracts from the original 2026-05-14 audit's "missing from deploy-full.ts" list now have explicit dispositions. The mainnet readiness Section A.1 is fully resolved.

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
