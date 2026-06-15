# Continuity Campaign — Audit 1: Proof-of-Life (ACTIVE path)

**Scope:** the ACTIVE Proof-of-Life + inheritance-claim continuity mechanism in
`contracts/vault/CardBoundVaultInheritanceManager.sol` (the deployed system per
`VFIDE_CONTINUITY_ARCHITECTURE.md` — NOT the legacy `UserVaultLegacy` next-of-kin flow). Conducted under the
Continuity Campaign rule: **Audit → Finding → Root Cause → Fix → Retest → Re-Audit → Update Registry**; a
capability does not advance while carrying an unresolved finding.

## Method
1. **Existence** — confirmed ACTIVE (`setProofOfLifeWallet`, `proofOfLifeWallet()` in the deployed CardBoundVault
   stack; `deploy-full.ts` deploys CardBoundVault ×25, UserVaultLegacy ×0).
2. **Source read** — full read of the PoL setter, claim initiation, veto, owner-override, recovery-precedence
   timer-freeze (pause/resume), and finalize.
3. **Executable model** — `lib/audit/proofOfLifeContinuityModel.ts` encodes the state machine + authority.
4. **Matrix** — `__tests__/audit/proofOfLifeContinuity.test.ts`: **32 scenarios** across PoL lifecycle, snapshot
   protection, initiation authority, the owner-defeats-collusion property, guardian veto, recovery timer-freeze,
   heir collusion, and off-chain threats. **All pass; typecheck 0; full audit suite 474/17 green.**

## Headline result — the mechanism is robust
The security property a continuity system needs holds: **a living owner defeats a false claim through the entire
claim window, even against full guardian collusion.** `ownerOverrideClaim` accepts the snapshot owner-admin OR the
snapshot proof-of-life wallet until `!distributionFinalized`. Guardian collusion only succeeds if the owner is
*also* unavailable for the full veto + claim windows — i.e. the legitimate "owner is actually gone" case.

Verified properties (each an executable scenario):
- **OWN-03** full guardian collusion (none veto) → live owner overrides → claim cancelled.
- **OWN-04** owner who LOST their admin wallet → the PoL backup wallet overrides.
- **OWN-02** owner returns deep into the claim window (day ~100) → still overrides.
- **SNAP-02** changing the PoL wallet AFTER a claim starts does NOT grant the new wallet override authority (the
  snapshot freezes the relevant PoL wallet at initiation).
- **REC-01/02** a pending recovery FREEZES the veto/claim clock; on resume the frozen duration is added back.
- **HEIR-01** colluding heirs revealing on day 1 cannot collapse the owner's window — the 14-day finalize floor
  holds and the owner can still override inside it.
- **INIT-02** the DAO guardian can veto but can NEVER initiate (Decision 12).

## Findings

### Finding 1 (LOW, FIXED) — stale in-code comment contradicts the implemented security behavior
**Root cause:** `claimHeirShare` carried a W92-era comment: *"the inheritance window timers keep ticking during
suspension; whether to PAUSE them … must be decided here."* Wave 95 since RESOLVED this by implementing
`pauseTimersForRecovery` / `resumeTimersAfterRecovery` (the timers are frozen during recovery and the duration is
added back). The comment therefore asserted the OPPOSITE of the actual behavior.
**Why it matters (not cosmetic):** an auditor or contributor reading that comment would carry a *wrong mental
model of the security property* (believing the owner's clock runs during recovery) or attempt to "implement" a
freeze that already exists — exactly the documentation-drift failure mode this project has fought.
**Fix:** comment corrected to state the W92 question is settled YES, with the implementing functions named.
Non-behavioral; the model + matrix (REC-01/02) verify the behavior the corrected comment describes.
**Retest / Re-audit:** full audit suite re-run green (474/17); REC scenarios assert the frozen-clock behavior.

### Considered and DISMISSED (with reasoning — not manufactured into fixes)
- **PoL setter has no timelock** (the hypothesized "PoL changed without protection"): NOT exploitable.
  `setProofOfLifeWallet` is admin-gated (the actor must already be the owner-admin, i.e. already has full vault
  control), and the snapshot at claim-initiation means a mid-claim change cannot grant an attacker override
  authority (SNAP-02). The asymmetry with the timelocked heir-config is *defensible*: PoL is a single backup
  credential the owner must be able to rotate promptly (e.g. if the PoL wallet is lost), whereas heir config is a
  multi-party distribution plan that benefits from a cool-off. No fix; correct as designed.
- **`ownerOverrideClaim` + unset PoL wallet**: a theoretical concern that an unset snapshot PoL (`address(0)`)
  could match an `address(0)` actor. NOT reachable — the actor is the authenticated caller resolved by the vault
  and cannot be `address(0)`. The model encodes the defensive guard anyway (DEF-01: empty actor never matches an
  unset PoL) to document the intended property; no contract change was warranted for an impossible precondition.
- **Overlapping-recovery resume** (integration): `resumeTimersAfterRecovery` clears suspension without checking
  whether a *second* recovery is still pending. This only matters if the vault permits concurrent recovery
  rotations. The vault's recovery state machine is single-rotation by design; flagged as a **cross-system
  integration item to confirm** when Guardian Management (Audit 2) reads the vault's rotation logic — not a
  confirmed defect here.

## Registry impact
Proof-of-Life capabilities advance on the stages this audit evidences — **source-correct (1), permissions (6),
edge matrix (10), adversarial (11), cross-system recovery-precedence (12)**, and the grandmother property (13:
the owner is never stranded and is never misled about protection). **Stage 2 remains `~` (compiled bytecode
pending — universal boundary); stages 3–5, 7–9 (backend/API/DB/frontend/workflow/journey) are NOT yet
full-stack-audited** and remain `.`. Per the never-`Y`-from-assumption rule, this is a real partial advance, not
an all-14 green — those stages await the bytecode run and a UX/full-stack pass.
