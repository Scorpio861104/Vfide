# Continuity Campaign — Audit 2: Guardian Management (ACTIVE path)

**Scope:** the ACTIVE guardian-management surface — add / remove / replace, threshold rules, the change timelock,
trustee (recovery-initiation) promotion, guardian maturity, and recovery-rotation instancing — in
`contracts/vault/CardBoundVault.sol`, `CardBoundVaultAdminFacet.sol`, `CardBoundVaultAdminManager.sol`. Conducted
under the Continuity Campaign rule (Audit → Finding → Root Cause → Fix → Retest → Re-Audit → Update Registry).

## Method
1. **Existence/path** — ACTIVE (guardian state + setters in the deployed CardBoundVault stack).
2. **Source read** — full read of `_applyGuardianChange`, `setGuardian`/`setGuardianThreshold`, the
   propose/apply/cancel timelock (`CardBoundVaultAdminManager`), `setTrustee`/`_applyTrusteeChange`,
   `isGuardianMature`, and the recovery-rotation lifecycle (`stageRecoveryRotation`/`proposeWalletRotation`).
3. **Executable model** — `lib/audit/guardianManagementModel.ts`.
4. **Matrix** — `__tests__/audit/guardianManagement.test.ts`: **20 scenarios** (add/remove + timelock veto,
   threshold rules + zero-redundancy, the maturity fix, guardian death/disappearance, owner-loses-contact,
   single-instance recovery). **All pass; typecheck 0; full audit suite 494/18 green.**

## What's strong (verified)
- **Change timelock (GUARDIAN_CHANGE_DELAY = 1 day):** post-setup, guardian and trustee changes go through
  propose→wait→apply; the owner can CANCEL within the window (ADD-01/03, MAT-05). `setGuardian`/`setTrustee`
  direct setters are bootstrap-only (ADD-02).
- **Removal safety:** cannot remove the last guardian (REM-02); threshold auto-clamps to count (REM-01); a removed
  guardian loses trustee power (REM-03).
- **Zero-redundancy guard (Wave 93/W87):** post-setup multi-guardian threshold cannot equal count — a 3-of-3 set
  (where one guardian death/loss locks recovery forever) is rejected; one guardian of redundancy is required
  (THR-03, DEATH-02). Single-guardian bootstrap preserved (THR-04).
- **Guardian death / multiple disappearance:** owner removes and the threshold clamps; dropping below 2
  guardians/threshold flags the vault below-safe-minimum (hub setup invalidated) (DEATH-01/03). The owner is never
  dependent on existing guardians to add replacements (OWNER-CONTACT-01).
- **Recovery rotation is SINGLE-INSTANCE:** one `pendingRotation` slot; a second stage overwrites with a new nonce
  (old approvals invalidated) — no concurrent recoveries (ROT-01). **This resolves the integration question
  flagged in Audit 1**: `resumeTimersAfterRecovery` clearing suspension while a second recovery is pending cannot
  occur, because a second concurrent recovery cannot exist.

## Finding

### Finding 2 (MEDIUM-LOW, FIXED) — documented guardian-maturity requirement was NOT enforced on trustee promotion
**Root cause:** `setTrustee`'s doc-comment states a safety requirement verbatim: *"Require the address to already
be a mature guardian (7-day maturity period prevents an instantly-added attacker guardian from being instantly
promoted to trustee)."* The maturity gate `isGuardianMature` exists — but `_applyTrusteeChange` (the chokepoint
for all trustee grants) only checked `isGuardian`, **never maturity**, and neither did `proposeTrusteeChange` /
`applyTrusteeChange`. The documented protection did not exist in code.
**Severity reasoning:** trustee status confers recovery-INITIATION power. Without maturity enforcement, a
compromised admin could add a guardian and promote it to trustee in two timelock cycles (~48h). The timelocks
(2×24h, both owner-cancellable) are a real mitigation — which is why this is MEDIUM-LOW, not HIGH — but the
maturity gate is a meaningful additional barrier: it forces the malicious guardian to remain visible for the full
7-day period before any promotion, materially increasing detection time for a continuity attack against a
vulnerable owner. A security-property comment/code mismatch is itself a defect (drift): the comment asserted a
protection a contributor/auditor would rely on.
**Fix:** `_applyTrusteeChange` now enforces maturity on trustee grants **post-setup** (bootstrap exempt so initial
setup isn't bricked), via a new `CBV_GuardianImmature` error. Mirrors `isGuardianMature`. Matches the documented
intent (AdminManager comment: "wait for her to mature, then promote her to trustee").
**Retest / Re-audit:** model encodes the maturity-gated chokepoint; matrix MAT-01 (fresh guardian → promotion
rejected) and MAT-02 (mature → allowed) verify the logic; MAT-04 confirms bootstrap exemption. Full audit suite
re-run green (494/18).
**Caveat (honest):** this is a SOURCE-level contract change. It is structurally sound (all referenced
state/constants/functions are in scope in `CardBoundVault.sol`; logic mirrors the existing view), but like the
entire contract layer it has **not been compile-confirmed in this environment** — a green hardhat run is the
stage-2 confirmation. The executable model verifies the logic the fix implements.

### Considered (no change warranted)
- **Instant threshold lowering** (`setGuardianThreshold` has no timelock): not independently exploitable — it
  requires admin (already full control), and weakening the threshold does not help an attacker who cannot also
  instantly add malicious guardians (which IS timelocked + maturity-gated). The bounds + zero-redundancy guards
  are the properties that matter, and they hold. No change.

## Registry impact
Guardian Management capabilities advance on the stages this audit evidences — **source-correct (1),
permissions (6), edge matrix (10), adversarial (11), cross-system recovery instancing (12)**, and the grandmother
property (13: the owner is never locked out by guardian loss, and recovery-initiation power cannot be
fast-tracked onto a fresh guardian). **Stage 2 remains `~` (compiled bytecode pending — and now additionally
gates the maturity fix); stages 3–5, 7–9 remain `.`** (full-stack not yet audited). Per never-`Y`-from-assumption,
a real partial advance, not all-14.
