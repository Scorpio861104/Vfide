# Wave 88 — Continuity Institution Campaign

The hardest state a system can face: **the owner exists but cannot speak for themselves** — hospitalized,
comatose, deployed, on a remote expedition, missing, or simply without a device for months. This campaign
draws the line the whole Preparedness Civilization turns on:

> **Recovery** is for an owner who is *alive and trying to regain access*.
> **Continuity** is for when the owner *cannot actively participate*.

It stress-tests the inheritance/continuity state machine two ways: can the absence model be turned into a
**backdoor** (falsely declaring a living-but-unreachable owner "gone" to seize the vault), and what happens
when the **owner returns** mid-process. Found **two real defects** (both fixed) and **one contract-level
design question** (flagged for the audit, deliberately not silently changed). The core absence-defense was
verified genuinely strong.

Verified (off-chain layer): typecheck 0, nav 0 broken, **122 tests / 13 suites**. CardBoundVault and the
inheritance manager can't be compiled here — fixes/verdicts are by code inspection; on-chain proof remains
the audit gate.

## The continuity state machine (what was audited)
`CardBoundVaultInheritanceManager.sol`: NORMAL(0) → VETO_PERIOD(1, 30d) → CLAIM_WINDOW(2, 90d) →
MEMORIAL(3, 365d) → CLOSED(4). A guardian initiates a claim; the owner (or a proof-of-life wallet) can
override during the veto window; heirs reveal commitment-secrets during the claim window; distribution
finalizes pro-rata; heirs then pull their shares. Funds never sit in the manager — it authorizes the vault
to release, and claims are a commitment-reveal *registration*, not a transfer.

## The two defects found & fixed
### Defect 1 — Active inheritance claim had no app-wide alarm (owner-returns / false-activation)
Recovery claims raise a loud, persistent, app-wide `OwnerChallengeBanner` a returning owner cannot miss.
Inheritance claims — which hand the vault to heirs if the owner is presumed gone — had **no equivalent
app-level alarm**. An owner who was briefly unreachable (a hospital stay, travel) and came back would open
the app and see *nothing* unless they happened to visit the inheritance pages — even though they hold the
single-action `ownerOverrideClaim` power to cancel it during the 30-day veto window. **Fix:** added
`components/security/OwnerInheritanceClaimBanner.tsx` — a loud sticky banner that fires only in
`STATE_VETO_PERIOD`, shows the live countdown to the deadline, and offers one-tap "I'm here — cancel this"
(calls `ownerOverride()`). Wired into `AppShell` beside the recovery banner so the two most dangerous
"someone is taking your vault" events are both impossible to miss.

### Defect 2 — Proof-of-life wallet (the absent-owner's ONLY defense) was under-explained
Because there is **no owner reclaim after the 30-day veto** (see the design question below), the
**proof-of-life wallet** is the de-facto safeguard for the long-absence scenarios: a second key the owner
designates, which a *trusted person could hold* to cancel a false claim while the owner is unreachable. Yet
it was presented as "an alternative wallet that can call `ownerOverrideClaim`… optional but recommended" —
raw jargon, no explanation of *when* it matters, *who* should hold it, or that it's the linchpin of the
absent-owner defense. An owner reading that has no way to know they should set it up **before** a crisis and
hand it to someone they trust. **Fix:** rewrote the proof-of-life explanation in `VaultInheritancePanel` to
be absence-aware — it now says plainly that this is the protection if you *can't respond*, to set it up
before you need it, to consider giving its key to someone trusted, and that it only works during the first
30 days. This converts a passive technical field into the understood safeguard it needs to be.

## The Continuity Edge Case Matrix
| Scenario | Outcome | Why |
|----------|---------|-----|
| **False continuity activation** | **Blocked** | Only a (non-DAO) guardian can `initiateInheritanceClaim`; requires NORMAL state, configured heirs, vault not paused, no recovery in progress. The DAO guardian can veto but never initiate. |
| **Continuity hijacking** (fake heir) | **Blocked** | `claimHeirShare` double-gates: keccak commitment-hash match (heir's secret) AND a configured-heir membership check. A non-heir, or an heir without the secret, cannot claim. |
| **Conflicting family claims** | **Resolved deterministically** | Shares are pre-set basis points capped at `TOTAL_BASIS_POINTS` (10000); finalization normalizes pro-rata across whoever revealed. No race, no double-pay (`claimedHashes`, per-nonce reveal guards). |
| **Hospitalization / coma (≤30 days)** | **Owner recovers** | Returns within the veto window → `ownerOverrideClaim` (or proof-of-life wallet) cancels instantly. |
| **Hospitalization / coma / deployment (>30 days)** | **GAP — see design question** | After veto expires the state rolls to CLAIM_WINDOW; owner override is rejected and heirs can finalize. Proof-of-life-held-by-trustee is the mitigation; no on-chain owner reclaim. |
| **Missing person / long absence** | Same as >30 days | The system runs on timers; it presumes absence = the configured outcome after the veto window. |
| **Inability to communicate** | Mitigated by proof-of-life | A trusted holder of the proof-of-life wallet can act for the owner during the veto window. |
| **Owner returns after activation (veto window)** | **Owner wins** | Loud app-wide banner (Defect 1) + one-tap override. |
| **Owner returns after activation (claim window)** | **GAP — design question** | No on-chain reclaim once heirs can claim; this is the hard boundary. |
| **Temporary vs permanent incapacity** | **System cannot distinguish** | It cannot know if you're coming back; the 30-day veto IS the boundary it uses. Temporary-incapacity protection = veto + proof-of-life; beyond that it treats absence as permanent by design. |

## The design question (flagged for contract audit, NOT changed)
**There is no on-chain owner reclaim during CLAIM_WINDOW.** `ownerOverrideClaim` and `vetoInheritanceClaim`
are both VETO_PERIOD-only, and `_rolloverToClaimWindowIfNeeded()` auto-advances the state the moment the
30-day veto expires. Worse for the absent owner: the heir **fast-finalize** path
(`finalizeInheritanceDistribution` runs as soon as *all* configured heirs reveal, not only after the full
90-day window) means distribution can complete shortly after day 30 if heirs coordinate — so the practical
owner-safe window can be as short as the 30-day veto. An owner returning from a 45-day coma to find the
vault already distributed has no contract-level remedy.

This is **deliberately flagged, not patched**, because:
- It cannot be fixed off-chain — it lives in the state machine.
- Adding an owner-reclaim path into CLAIM_WINDOW has real trade-offs: it weakens the guarantee heirs rely
  on (the whole point of the window is that heirs can finally act), and it needs careful design (how long?
  partial vs full? what about already-withdrawn shares?).
- The right venue is the contract-audit pass, alongside the W87 flag (`threshold == count`) and the W86
  state-machine review.
- The honest mitigation today is the proof-of-life wallet (now properly explained, Defect 2) plus
  potentially lengthening the veto window — both surfaced to the owner rather than hidden.

## What was verified sound (not changed)
- **False activation is well-defended** — guardian-only initiation, DAO-can-veto-not-initiate, NORMAL-state
  + paused + recovery-in-progress guards.
- **Hijacking is double-gated** (commitment secret AND configured-heir membership).
- **Conflicting claims** are deterministic and capped — no race or over-payment.
- **Funds are never custodied** by the manager; claims are commitment-reveal registrations, distribution is
  pro-rata, and unrevealed shares are forfeited to the pool rather than misassigned.
- The boundary between Recovery and Continuity is **clean and enforced by state**: a claim cannot start
  while a recovery rotation is pending (`INH_RecoveryInProgress`), so the two institutions can't collide.

## Remaining caveats (honest)
- **On-chain runtime unproven here.** Both fixes are off-chain (a new banner + clearer copy); the
  contract-dependent matrix verdicts are by inspection. Audit remains the gate.
- The big residual is the post-veto reclaim gap above — partially mitigated (loud veto-window alarm +
  proof-of-life now explained), structurally open at the contract level by design choice.
- Proof-of-life only helps owners who set it up *in advance* and entrust the key well; the product now
  explains this, but cannot enforce it.

## Completion decision
**Continuity earns ✅ COMPLETE (off-chain) / 🔒 contract audit gate** — it survived a scenario-first
adversarial audit across the full absence spectrum (false activation, hijacking, conflicting claims,
hospitalization/coma, missing-person, owner-returns, temporary-vs-permanent), found and fixed two real
defects on the owner-protection side, verified the core absence-defense genuinely strong, and surfaced the
one hard structural boundary honestly rather than papering over it. The post-veto reclaim question is the
most consequential flag carried into the contract-audit phase.

## Next
**Wave 89 — Successors & Emergency Operators Campaign** (scenario-first), then the **Preparedness
Civilization Audit** (Wave 90) across Ownership → Recovery → Guardians → Continuity → Successors → Emergency
Operators — verifying they operate as one coherent preparedness organism, with the residual long-absence
boundary as the central question.
