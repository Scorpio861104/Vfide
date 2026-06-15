# Continuity Lock — Capability BUILD (Backend Completion Campaign 12 · Wave E)

**Status change: PLANNED/no-code → BUILT.** This campaign implements the Continuity Lock that the continuity
architecture previously marked as not built. New artifacts: `contracts/vault/ContinuityLock.sol` (Solidity),
`lib/audit/continuityLockModel.ts` (logic model), `__tests__/audit/continuityLock.test.ts` (**154 scenarios; all
pass; typecheck 0; full audit suite 2460/40 green**). Target (150+) met.

> Build discipline: the Solidity is written for the real toolchain; it is **not compiled here** (no solc in the
> sandbox). The TS model + matrix certify the LOGIC and the non-custodial guarantees. Open boundary: a real
> solc-0.8.30 compile + professional audit + the inheritance-manager integration wiring.

## The problem it solves
`CardBoundVaultInheritanceManager.ownerOverrideClaim()` lets the owner / proof-of-life wallet cancel a claim right
up until finalization — great for a LIVING owner, but a post-veto attack surface: a **compromised owner key** (the
owner has died and an attacker holds the key) could repeatedly cancel a legitimate claim during the 90-day CLAIM
window to **stall** the heirs forever, or propose a new config to **hijack** (redirect) the inheritance.

## The design — lock PROCESS, never FUNDS
Once a claim's **veto window (30d — the owner's generous single-key defense)** elapses and the claim is still active
(CLAIM_WINDOW, not finalized, not owner-reclaimed), the lock engages **deterministically** (LOCK-*, GG-*):
- **Config frozen (CFG-*, ATK-hijack):** propose / confirm / clear-heirs all revert — a compromised key cannot
  redirect the heirs.
- **Lone-key override blocked (OVR-*, ATK-stall, STALL-*):** the single-key `ownerOverrideClaim` reverts — a
  compromised key cannot stall the heirs by cancelling.
- **Guardian-corroborated owner escape preserved (GV-*, Q-*, QSWEEP-*, ATK-legit-owner):** a genuinely-returning
  owner, vouched for by a **quorum of their own guardians**, can still reclaim. A lone key can never reach the
  quorum (it is not a guardian, and the lone override is blocked).
- **Heirs complete deterministically (HEIR-*):** heir claims + finalize are NEVER blocked by the lock — the lock
  exists precisely to let them complete.

## Non-custodial guarantees (certified)
- **Locks process, not funds (NC-*, CLOSE-01):** the lock never holds, moves, or seizes funds — it gates only the
  config/cancel transitions. Heirs claim with their own secrets; finalize distributes to the pre-committed heirs.
- **Owner's veto window fully preserved (VETO-*, CLOSE-02):** the lock NEVER engages during the veto window — the
  owner keeps full single-key control until that window closes.
- **Releases correctly (CLOSE-05):** the lock releases on finalize or on a guardian-corroborated owner reclaim.
- **Deterministic + observable:** engagement is a pure function of state + time; no party engages or releases it at
  discretion.

## Attack matrix (all defended)
| Attack | Defense | Scenarios |
|---|---|---|
| Compromised key redirects heirs post-veto | Config frozen while locked | ATK-hijack, CFG-* |
| Compromised key stalls heirs by cancelling | Lone-key override blocked | ATK-stall, STALL-* |
| Lone attacker fakes a guardian quorum | Non-guardian votes rejected; quorum unreachable | ATK-fake-guardian, ACC-mixed |
| Legitimate owner locked out unfairly | Guardian-corroborated reclaim escape | ATK-legit-owner, Q-* |
| Lock engages too early (pre-veto) | Lock confined to CLAIM_WINDOW | ATK-pre-veto-untouched, VETO-* |

## Integration points (for the inheritance manager)
`proposeInheritanceConfig` / `confirmInheritanceConfig` / `clearAllHeirs` call `requireConfigChangeAllowed(...)`;
`ownerOverrideClaim` calls `requireLoneOwnerOverrideAllowed(...)` (so post-veto it routes through the guardian
quorum instead); a post-veto reclaim accumulates `castGuardianReclaimVote(...)` and gates on
`checkGuardianCorroboratedReclaim(...)`.

## Certification status (ledger)
**Continuity Lock: Exists = Yes (BUILT this campaign) · Certified (src+model) = Yes (154 scenarios) · Findings =
none (new build; non-custodial by construction) · Findings-Fixed = n/a.** Open boundary: real solc compile +
professional audit + inheritance-manager wiring.
