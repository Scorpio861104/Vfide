# VFIDE — Repo Cleanup Plan

**Goal:** Reduce the contract surface from 73 top-level Solidity files to roughly 25–30 active contracts plus a clearly-marked "future" tier. Every change in this document is verified against actual import graphs and consumer code in the uploaded repo.

**How to use this:** Work top-down. Each section is independent. Each item names the consumers that need updating before the file can be deleted, and the validation step after.

**Before starting:** create a working branch (`cleanup/contract-consolidation`). Never delete files in the same commit you update importers — split each section into "update importers" and "remove file" commits so revert is granular.

---

## Section 1 — Safe deletes (no on-chain consumers)

These are files that are only imported by themselves, by tests, or by other files that will be deleted in this section. Removing them changes nothing about the deployed system.

### 1.1 — `contracts/TempVault.sol`

**Why:** Its own header says "developer testing utility only; do not route production funds." Not deployed by `scripts/deploy-all.ts`. Not imported by any other contract. Used only by an auto-generated test stub.

**Delete:**
```bash
rm contracts/TempVault.sol
rm test/hardhat/generated/TempVault.generated.test.ts
```

**Verify:** `grep -rn "TempVault" contracts/ scripts/` returns nothing.

### 1.2 — `contracts/DeployPhase1.sol`, `DeployPhase1Governance.sol`, `DeployPhase1Token.sol`, `DeployPhase1Infrastructure.sol`, `DeployPhases3to6.sol`

**Why:** Verified — none of these are imported by any contract. The TS deploy script (`scripts/deploy-all.ts`) is the source of truth for deployment, and it never calls these. `DeployPhase1Infrastructure.sol` always reverts (line 16) — it's documented dead. The only Solidity "DeployPhase…" file with a real consumer is `DeployPhase3Peripherals.sol` (used by `contracts/scripts/deploy-phase3.ts`), so leave that one alone for now.

**Delete:**
```bash
rm contracts/DeployPhase1.sol
rm contracts/DeployPhase1Governance.sol
rm contracts/DeployPhase1Token.sol
rm contracts/DeployPhase1Infrastructure.sol
rm contracts/DeployPhases3to6.sol
```

**Verify:** `grep -rn "DeployPhase1\|DeployPhases3to6" contracts/ scripts/` shows zero hits in `.sol` files.

### 1.3 — `contracts/WithdrawalQueue.sol`

**Why:** This is the standalone abstract `WithdrawalQueue`. It has no concrete implementation in production — only a mock at `contracts/mocks/WithdrawalQueueStub.sol`. The actual production withdrawal queue is internal to `CardBoundVault.sol`. Per the mainnet readiness audit, this file confused everyone who tried to understand the withdrawal architecture.

**Update first:**
```bash
rm contracts/mocks/WithdrawalQueueStub.sol
```
then update `contracts/scripts/deploy-phase1.ts` lines 178–186 to remove the `WithdrawalQueueStub` deploy step (it's gated on `ALLOW_WITHDRAWAL_QUEUE_STUB`, but the contract no longer exists). Also remove `NEXT_PUBLIC_WITHDRAWAL_QUEUE_ADDRESS` from `.env.production.example`, `.env.mainnet.example`, `.env.staging.example`, `.env.example`.

**Delete:**
```bash
rm contracts/WithdrawalQueue.sol
rm contracts/DeployPhase1Infrastructure.sol  # already deleted in 1.2
```

**Verify:** `grep -rn "WithdrawalQueue" contracts/` should only show internal `withdrawalQueue` arrays inside `CardBoundVault.sol`.

### 1.4 — `contracts/VFIDETestnetFaucet.sol`

**Why:** The faucet reverts in its constructor on mainnet chains (chain whitelist on lines 344-352). It has no business in `PRODUCTION_SET.md`. Should live in a separate testnet tree.

**Move:**
```bash
mkdir -p contracts/testnet
mv contracts/VFIDETestnetFaucet.sol contracts/testnet/VFIDETestnetFaucet.sol
```

Update `scripts/deploy-all.ts` line ~75 to wrap its deploy in `if (process.env.NETWORK?.includes('sepolia') || process.env.NETWORK?.includes('amoy'))`.

Update `app/api/faucet/claim/route.ts` to fail closed when `NEXT_PUBLIC_IS_TESTNET !== 'true'`.

Remove from `contracts/PRODUCTION_SET.md`. Add to a new `contracts/TESTNET_SET.md`.

---

## Section 2 — Compatibility shims (delete after fixing importers)

These files exist only to keep older import paths resolving. Delete them and update the importers.

### 2.1 — `contracts/VFIDETrust.sol` (21 lines, pure shim)

The whole file is:
```solidity
import "./ProofLedger.sol";
import "./Seer.sol";
```

**Importers to fix (3 files):**
- `contracts/SharedInterfaces.sol`
- `contracts/VFIDEBadgeNFT.sol`
- `contracts/BadgeManager.sol`

**Update:** in each of those three files, replace `import "./VFIDETrust.sol";` with the two direct imports. If they only need `Seer`, just `import "./Seer.sol";`. If they only need `ProofLedger`, just `import "./ProofLedger.sol";`.

**Delete:**
```bash
rm contracts/VFIDETrust.sol
```

**Verify:** `grep -rn "VFIDETrust" contracts/` returns nothing.

---

## Section 3 — Multi-contract files (split or consolidate)

Six files contain multiple contracts. This inflates the "contract count" and makes the codebase look bigger than it is. Decide for each: split into separate files (if all contracts are real) or remove the inactive ones.

### 3.1 — `contracts/MainstreamPayments.sol` (1,289 lines, 5 contracts)

Contains: `FiatRampRegistry`, `MainstreamPriceOracle`, `SessionKeyManager`, `TerminalRegistry`, `MultiCurrencyRouter`. **None are deployed by `deploy-all.ts`. None are imported by any deployed contract.**

This is 1,289 lines of designed-but-not-launching code. Two options:

**Option A — defer to v2 (recommended):**
```bash
mkdir -p contracts/future
mv contracts/MainstreamPayments.sol contracts/future/MainstreamPayments.sol
```
Mark it clearly in a `contracts/future/README.md` as "designed for v2 — not in current deploy."

**Option B — split into 5 files** if you plan to launch some of them: `FiatRampRegistry.sol`, `MainstreamPriceOracle.sol`, etc. This makes future review and incremental deploys easier.

Either way, removing this file from the active production set drops your "contract count" by 5 immediately.

### 3.2 — `contracts/VFIDESecurity.sol` (530 lines, 4 contracts)

Contains: `GuardianRegistry`, `GuardianLock`, `PanicGuard`, `EmergencyBreaker`. None deployed by `deploy-all.ts`. PanicGuard is *referenced* by `OwnerControlPanel.vault_freezeVault`, but no vault contract reads its quarantine flag (per the marketing-vs-code findings).

If you keep these:
- Split into `GuardianRegistry.sol`, `GuardianLock.sol`, `PanicGuard.sol`, `EmergencyBreaker.sol`
- Wire PanicGuard reads into the vault flow OR delete `vault_freezeVault` (per finding 3 in marketing-vs-code)
- Add to deploy-all.ts

If you don't:
- Move to `contracts/future/`
- Remove `OwnerControlPanel.setPanicGuard` and `vault_freezeVault` (they reference a contract that's never deployed)

### 3.3 — `contracts/Pools.sol` (3 contracts)

Contains: `DAOPayrollPool`, `MerchantCompetitionPool`, `HeadhunterCompetitionPool`. All three inherit from `ServicePool.sol`. Not deployed by `deploy-all.ts`, but `FeeDistributor` expects their addresses — meaning once you launch fee distribution, these MUST be deployed.

**Action:** Split into `contracts/pools/DAOPayrollPool.sol`, `contracts/pools/MerchantCompetitionPool.sol`, `contracts/pools/HeadhunterCompetitionPool.sol`. Add all three to `deploy-all.ts` before `FeeDistributor`.

This isn't dead code — it's *missing* from your deploy script. Either deploy them or hardcode their addresses to zero in FeeDistributor (which would mean those allocations get burned with the rest, breaking the tokenomics model).

### 3.4 — `contracts/Seer.sol` (1,371 lines, 2 contracts)

Contains: `Seer` and `ProofScoreBurnRouterPlus`. Both are real, `Seer` is deployed by `deploy-all.ts`. `ProofScoreBurnRouterPlus` should also be deployed (it extends `ProofScoreBurnRouter` which IS deployed) but isn't.

**Action:** Either:
- Delete `ProofScoreBurnRouterPlus` if `ProofScoreBurnRouter` is the version you're shipping
- Or split it into `contracts/ProofScoreBurnRouterPlus.sol` and add to deploy-all

Right now this is undecided in code — exact same dilemma as VFIDECommerce vs MerchantPortal (see 4.1).

### 3.5 — `contracts/VaultInfrastructure.sol` (1,305 lines, 3 contracts)

Contains: `UserVaultLegacy`, `UserVaultBytecodeProvider`, `VaultInfrastructure`. **This is the legacy vault implementation.** `lib/contracts.ts:253` confirms `ACTIVE_VAULT_IMPLEMENTATION` defaults to `'cardbound'`, not `'uservault'`.

**Importers:**
- `contracts/CardBoundVault.sol:21` — only a comment reference
- `contracts/DevReserveVestingVault.sol:34` — only a comment reference
- `contracts/VaultRegistry.sol:5` — imports `IVaultInfrastructure` interface (which is fine — interfaces stay)
- `contracts/interfaces/IVaultInfrastructure.sol` — the interface, keep

**Action — full delete:**
1. Confirm with the team: are you committing to CardBoundVault as the only vault implementation? If yes, proceed.
2. Delete the three contracts inside `VaultInfrastructure.sol`. Keep the file ONLY if `IVaultInfrastructure` interface logic stays compatible.
3. Or move it to `contracts/legacy/VaultInfrastructure.sol` if you want the historical reference.

Removing this drops your "contract count" by 3 and your LOC by 1,305 — the single biggest cleanup win in the repo.

### 3.6 — `contracts/VFIDECommerce.sol` (261 lines, 2 contracts)

Contains: `MerchantRegistry`, `CommerceEscrow`. **Triple-overlap** with:
- `contracts/MerchantPortal.sol` (1,163 lines, deployed) — has its own merchant registry and escrow logic
- `contracts/EscrowManager.sol` (separate file) — also has escrow logic

This is the messiest part of the repo. Three contracts, all doing variations of "merchants and escrow." See section 4.1 for resolution.

---

## Section 4 — Redundancies (consolidate to one)

### 4.1 — Commerce / Escrow trio: `MerchantPortal` vs `VFIDECommerce` vs `EscrowManager`

The repo has three contracts that all touch commerce/escrow:
- `MerchantPortal.sol` — 1,163 LOC, **deployed**, has merchant registry + payments + escrow
- `VFIDECommerce.sol` — 261 LOC, contains `MerchantRegistry` and `CommerceEscrow`, **not deployed**
- `EscrowManager.sol` — separate escrow contract, **not deployed**

**Decision needed:** which one is the canonical commerce contract for launch?

- If `MerchantPortal` is the answer (likely — it's the one deployed), delete or move `VFIDECommerce.sol` and `EscrowManager.sol` to `contracts/future/`. Remove their interface files from `contracts/interfaces/` (`ICommerceEscrow.sol`, `IMerchantRegistry.sol`).
- If `VFIDECommerce + EscrowManager` is the cleaner architecture, delete `MerchantPortal.sol` and add the other two to `deploy-all.ts`.
- Mixed: not OK — pick one architecture.

Saves 261 + (EscrowManager LOC) + 2 interfaces.

### 4.2 — Treasury split: `VFIDEFinance.EcoTreasuryVault` vs `StablecoinRegistry`

`VFIDEFinance.sol` says "VFIDE-only treasury, no stablecoin registry." `StablecoinRegistry.sol` is its own file, also on the production list. They contradict each other.

**Importers tell the story:**
- `EcoTreasuryVault` (in VFIDEFinance.sol) is referenced by `Seer.sol`, `VFIDEToken.sol`, and `IEcoTreasuryVault.sol` — actively wired.
- `StablecoinRegistry` is only imported by `SharedInterfaces.sol` (for the interface).

**Action:** Either delete `StablecoinRegistry.sol` (no consumers) or consolidate it into `VFIDEFinance.sol`. The current state is "one contract is real, one is dead."

If you want stablecoin support: keep `StablecoinRegistry`, delete the comment in `VFIDEFinance.sol` that says "no stablecoin registry," and wire it into `MerchantPortal` or wherever payment-token validation should live.

If you don't: delete `StablecoinRegistry.sol`.

### 4.3 — `VFIDEReentrancyGuard.sol` vs `SharedInterfaces.ReentrancyGuard`

You have **three** ReentrancyGuard implementations:
- `SharedInterfaces.ReentrancyGuard` — single-contract guard, used by most contracts
- `VFIDEReentrancyGuard.sol` (60 LOC) — cross-contract guard with mappings, used by `WithdrawalQueue` and `CircuitBreaker`
- OZ `ReentrancyGuard` — used by `VFIDEBridge`, `VaultRecoveryClaim`, `VaultRegistry`

Once `WithdrawalQueue.sol` is deleted (section 1.3), only `CircuitBreaker.sol` uses `VFIDEReentrancyGuard`. Migrate `CircuitBreaker.sol` to OZ's `ReentrancyGuard` and delete `VFIDEReentrancyGuard.sol`.

This cuts a tiny file but removes a maintenance burden — three reentrancy implementations is unnecessary.

### 4.4 — `VFIDEAccessControl.sol` (151 lines)

Imports OZ `AccessControlEnumerable` and adds three roles. Used by `WithdrawalQueue` (deleted in 1.3) and `CircuitBreaker`.

After 1.3: only `CircuitBreaker` uses it. Either keep it (it's small) or inline the role definitions into `CircuitBreaker` and delete this file.

---

## Section 5 — "Designed but not launching" (move to a separate tier)

Per your audit tracker, these are real contracts you've built but aren't ready for the launch deploy. They shouldn't be in the same directory as launch contracts because every audit and every reader gets confused trying to figure out what's in scope.

**Action:** Create `contracts/v2/` or `contracts/future/` and move:

```bash
mkdir -p contracts/future
mv contracts/VFIDEBridge.sol contracts/future/                # acknowledged unfixed critical
mv contracts/SeerAutonomous.sol contracts/future/             # not ready
mv contracts/SeerAutonomousLib.sol contracts/future/
mv contracts/SeerGuardian.sol contracts/future/
mv contracts/SeerSocial.sol contracts/future/
mv contracts/SeerWorkAttestation.sol contracts/future/
mv contracts/CouncilElection.sol contracts/future/            # not ready
mv contracts/CouncilManager.sol contracts/future/
mv contracts/CouncilSalary.sol contracts/future/
mv contracts/VFIDEEnterpriseGateway.sol contracts/future/     # not ready
mv contracts/BadgeManager.sol contracts/future/               # not ready
mv contracts/BadgeRegistry.sol contracts/future/
mv contracts/BadgeQualificationRules.sol contracts/future/
mv contracts/VFIDEBadgeNFT.sol contracts/future/
mv contracts/VFIDEBenefits.sol contracts/future/              # not deployed by deploy-all.ts
mv contracts/VFIDEFlashLoan.sol contracts/future/             # if not launching - check
mv contracts/SubscriptionManager.sol contracts/future/        # if not launching - check
mv contracts/MainstreamPayments.sol contracts/future/         # 5 contracts, all unwired
mv contracts/SeerView.sol contracts/future/                   # if SeerAutonomous moves, this follows
mv contracts/SeerPolicyGuard.sol contracts/future/
mv contracts/BridgeSecurityModule.sol contracts/future/       # follows VFIDEBridge
```

Add a `contracts/future/README.md` listing what each is, why it's deferred, and the rough roadmap timing.

Update `contracts/PRODUCTION_SET.md` to remove these entries.

Update any frontend pages for these features (`app/flashloans/page.tsx`, `app/elections/page.tsx`, `app/badges/page.tsx`, etc.) to either:
- Be feature-flagged off via `lib/features.ts`
- Show a "Coming soon" placeholder
- Be deleted from the frontend until the contract is ready

This is ~22 contracts/files moved. After this section the active `contracts/` directory holds only what's actually launching.

---

## Section 6 — Reorganize what's left

After sections 1–5, the active `contracts/` directory should be roughly:

### Token & treasury (3)
- `VFIDEToken.sol`
- `DevReserveVestingVault.sol`
- `VFIDEFinance.sol` (containing `EcoTreasuryVault`) — or split into its own file

### Vault system (4)
- `CardBoundVault.sol`
- `CardBoundVaultDeployer.sol`
- `VaultHub.sol`
- `VaultRegistry.sol`
- `VaultRecoveryClaim.sol`
- `SanctumVault.sol`

### Trust & scoring (3)
- `Seer.sol`
- `ProofLedger.sol`
- `ProofScoreBurnRouter.sol`

### Commerce (1, after 4.1 resolution)
- `MerchantPortal.sol` (assuming you pick this as canonical)

### Fee distribution (1 + 3 pool sub-contracts)
- `FeeDistributor.sol`
- `Pools.sol` (or 3 split files: `DAOPayrollPool.sol`, `MerchantCompetitionPool.sol`, `HeadhunterCompetitionPool.sol`)
- `ServicePool.sol`

### Governance & ops (5)
- `DAO.sol`
- `DAOTimelock.sol`
- `GovernanceHooks.sol`
- `AdminMultiSig.sol`
- `OwnerControlPanel.sol`

### Lending (1, if launching)
- `VFIDETermLoan.sol`

### System & emergency (3)
- `EmergencyControl.sol`
- `CircuitBreaker.sol`
- `SystemHandover.sol`

### Other (3)
- `FraudRegistry.sol`
- `VFIDEPriceOracle.sol`
- `RevenueSplitter.sol`
- `DutyDistributor.sol`
- `LiquidityIncentives.sol`

### Support (3, kept as utility)
- `SharedInterfaces.sol` (or split into `contracts/interfaces/` + `contracts/base/`)
- `EcosystemVault.sol`
- `EcosystemVaultLib.sol`
- `EcosystemVaultView.sol`
- `PayrollManager.sol`

**Total active: ~28-32 contracts.** That matches your gut number.

You can optionally split this into subdirectories:
```
contracts/
├── token/          # VFIDEToken, DevReserveVestingVault, VFIDEFinance
├── vault/          # CardBoundVault, VaultHub, VaultRegistry, etc.
├── trust/          # Seer, ProofLedger, ProofScoreBurnRouter
├── commerce/       # MerchantPortal
├── fees/           # FeeDistributor, Pools, ServicePool
├── governance/     # DAO, DAOTimelock, AdminMultiSig, OwnerControlPanel
├── system/         # EmergencyControl, CircuitBreaker, SystemHandover
├── interfaces/     # all I*.sol files
├── base/           # Ownable, ReentrancyGuard, etc. (extracted from SharedInterfaces)
├── future/         # things designed for v2
└── testnet/        # VFIDETestnetFaucet
```

Whether to do this depends on team preference. Most auditors find directory-organized codebases easier to scope.

---

## Section 7 — Validation (after each section)

After every cleanup commit:

1. **Compile**: `npx hardhat compile` should succeed with zero warnings beyond what was already there.
2. **Slither**: `slither contracts/` — should produce a smaller findings list, not larger.
3. **Tests**: `npx hardhat test` — all currently-passing tests should still pass.
4. **Frontend ABI parity**: `lib/abis/index.ts` references ABI JSON files — make sure none of them point to files for contracts you just deleted. Check `lib/abis/*.json` against the active contract list.
5. **Production manifest**: `contracts/PRODUCTION_SET.md` should match what's actually in the active contract set.
6. **Deploy script dry-run**: `npx hardhat run scripts/deploy-all.ts --network localhost` should still complete.

---

## Summary

Doing all of the above produces:

| Before | After |
|--------|-------|
| 73 top-level `.sol` files | ~28-32 active + ~22 in `contracts/future/` |
| 78 contracts total | ~32 active |
| ~35,000 LOC active | ~22,000-25,000 LOC active |
| Mixed deploy/legacy/future | Clear tiers |
| `PRODUCTION_SET.md` lists 65 deployable | Lists ~30 (matches reality) |

The 73-file count was the project's complexity hidden in plain sight. After this cleanup, when someone asks "how big is VFIDE," you can answer "32 contracts" instead of "73 files but really 65 deployable but really only 15 in the deploy script…"

---

## A note on order

Don't tackle this all in one PR. Suggested sequence:

1. **PR 1 — pure deletes (Section 1):** TempVault, dead deploy orchestrators, WithdrawalQueue, faucet move. Lowest risk, biggest signal.
2. **PR 2 — shim removal (Section 2):** VFIDETrust shim. Touches 3 importers.
3. **PR 3 — `contracts/future/` move (Section 5):** moves ~22 files but deletes none. Reversible.
4. **PR 4 — multi-contract files (Section 3):** split or move. Per-file decisions.
5. **PR 5 — redundancy resolution (Section 4):** the trickiest — requires deciding the canonical commerce contract.
6. **PR 6 — reorganize remaining (Section 6):** directory restructure if desired.

Each PR should have its own audit pass before merging. Each makes the next one easier.

— end of plan
