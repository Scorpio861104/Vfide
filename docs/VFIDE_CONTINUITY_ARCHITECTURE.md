# VFIDE Continuity Architecture — Canonical Reference

**Authoritative source for which continuity mechanism is real.** The names *Proof-of-Life, Heir, Inheritance
Claim, Next-of-Kin, Successor, Chain of Return, Continuity Lock* no longer describe one system — they span
multiple generations of design. This document locks each term to its actual status and code. **Build only on
ACTIVE.** Everything here is verified against the source, the deploy script, and the address config (evidence at
the bottom) — not branding.

---

## ACTIVE — the deployed continuity system (build on this)

Deployed by `scripts/deploy-full.ts` (CardBoundVault stack; **25 CardBoundVault refs, 0 UserVaultLegacy refs**)
and present in `CONTRACT_ADDRESSES`. Audited at source + model level (manifest §1–§2); stage 2 compiled run
pending.

**Contracts:** `contracts/vault/CardBoundVault.sol` (+ AdminFacet / SubManagerDeployer / BytecodeProvider /
Deployer) and `contracts/vault/CardBoundVaultInheritanceManager.sol`.

| Capability | Active API (exact) |
|---|---|
| **Proof of Life** | `setProofOfLifeWallet(actor, polWallet)` · `proofOfLifeWallet()` getter |
| **Heir configuration** (propose → confirm, timelocked) | events `InheritanceConfigProposed(pendingVersion, heirGuardians, heirCommitments, effectiveAt)` → `InheritanceConfigConfirmed(configVersion, …)`; state `heirGuardianByIndex`, `heirCommitmentByGuardian`, `heirCount` |
| **Guardian confirmation** | `isGuardian(address)` · `guardianThreshold()` (heir-guardians confirm via commitment reveal) |
| **Inheritance Claim** (initiate) | `initiateInheritanceClaim(actor, reasonHash)` |
| **Heir Distribution** (claim share) | `claimHeirShare(actor, heirSecret, basisPoints)` |
| **Distribution finalization** | `finalizeInheritanceDistribution()` |
| **DAO guardian** (optional) | `setDAOGuardian(actor, dao)` |
| **Recovery** (guardian/trustee-gated) | CardBoundVault recovery facet + `VaultRegistry` guardian set (`removeGuardian`, threshold) |

**Mechanism in one line:** the owner pre-commits heir-guardians + hashed heir secrets (timelocked propose→confirm);
the living owner's proof-of-life blocks premature claims; on a valid inheritance claim, guardians/heirs reveal
commitments and shares distribute. No "next of kin" address registration is involved.

---

## LEGACY — superseded `UserVaultLegacy` (do NOT build on)

`UserVaultLegacy`, inside `contracts/legacy/VaultInfrastructure.sol`. **Absent from `CONTRACT_ADDRESSES`; deployed
0 times by `deploy-full.ts`.** It is exercised only by the two legacy verify scripts (which load
`artifacts/contracts/legacy/VaultInfrastructure.sol/UserVaultLegacy.json`) and a couple of audit-blocker tests.

| Legacy term | Legacy API | Status |
|---|---|---|
| **Next of Kin / Successor** | `setNextOfKin(kin)` | superseded by heir-commitments |
| **Request Inheritance** | `requestInheritance()` | superseded by `initiateInheritanceClaim` |
| **Approve Inheritance** | `approveInheritance()` | superseded by guardian commitment-reveal |
| **Finalize Inheritance** | `finalizeInheritance()` | superseded by `finalizeInheritanceDistribution` |

These have working verify scripts, which makes them *look* blessed — they are not on the deployment path. A
contributor extending `setNextOfKin` would be building on a vault the app never deploys.

---

## PLANNED / CONCEPTUAL — names without implementation

Branding/roadmap language with **no implementing code under that name** (grep-confirmed):

- **Chain of Return** — no `chainOfReturn` symbol; `verify-chain-of-return-timelock.ts` actually tests the LEGACY
  `UserVaultLegacy`. The *concept* (continuity hand-off) is served on the active path by the heir + proof-of-life
  mechanism above, under different names.
- **Continuity Lock** — no code, no script. Not built.

If these are to become real, they must be implemented on the ACTIVE CardBoundVault architecture and certified
through the standard — not mapped back onto legacy functions.

---

## REMOVED — deliberate non-capabilities (launch-gated)

Intentionally absent to preserve non-custodiality (see the Capability Registry's launch-gate section):
fund-freeze, escrow holds, blacklist-on-funds, and **force/admin-recovery** (recovery is guardian/trustee-gated,
never admin-unilateral). Re-adding any of these is a certification-blocking regression.

---

## Terminology lock (the table contributors should check first)

| Term you may see | TRUE status | Maps to | Build on it? |
|---|---|---|---|
| Proof of Life | **ACTIVE** | `setProofOfLifeWallet` (CardBoundVault) | ✅ yes |
| Heir / Heir Commitment | **ACTIVE** | `heirCommitmentByGuardian`, `InheritanceConfig*` | ✅ yes |
| Inheritance Claim | **ACTIVE** | `initiateInheritanceClaim` | ✅ yes |
| Heir Distribution | **ACTIVE** | `claimHeirShare`, `finalizeInheritanceDistribution` | ✅ yes |
| Guardian (recovery/heir) | **ACTIVE** | `VaultRegistry` / `isGuardian` + `guardianThreshold` | ✅ yes |
| Next of Kin | **LEGACY** | `setNextOfKin` (UserVaultLegacy) | ❌ no |
| Successor | **LEGACY** | UserVaultLegacy continuity | ❌ no |
| Request/Approve/Finalize Inheritance | **LEGACY** | UserVaultLegacy | ❌ no |
| Chain of Return | **PLANNED** | (no code; concept) | ❌ not yet built |
| Continuity Lock | **PLANNED** | (no code) | ❌ not yet built |
| Fund freeze / escrow / force-recovery | **REMOVED** | (deliberately absent) | 🚫 launch-gate |

---

## Evidence (so this document is itself verifiable, not asserted)
- `scripts/deploy-full.ts`: CardBoundVault stack deployed (25 refs); `UserVaultLegacy` deployed 0 times.
- `CONTRACT_ADDRESSES` (`lib/contracts.ts`): VaultHub / CardBoundVault path configured; no VaultInfrastructure/
  UserVaultLegacy address entry.
- `scripts/verify-next-of-kin-inheritance.ts` & `scripts/verify-chain-of-return-timelock.ts`: both load
  `artifacts/contracts/legacy/VaultInfrastructure.sol/UserVaultLegacy.json` — i.e. they test LEGACY.
- Active manager source (`CardBoundVaultInheritanceManager.sol`): `setProofOfLifeWallet`,
  `initiateInheritanceClaim`, `claimHeirShare`, `finalizeInheritanceDistribution`, `InheritanceConfigProposed/
  Confirmed`, `guardianThreshold`.
- Grep: no `chainOfReturn` / `continuityLock` symbol anywhere in `contracts/`, `lib/`, `app/`.

Referenced by `VFIDE_CAPABILITY_REGISTRY.md` (Recovery & Continuity section + Deployment Path column).
