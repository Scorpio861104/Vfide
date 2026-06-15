# Wave 86 — Recovery Institution Campaign + Preparedness Edge Case Matrix

A deliberately different campaign. The commerce audits asked "does the institution behave correctly?";
the Vault asked "can ownership be taken away?"; Recovery is audited through **adversarial real-world
scenarios** — because this is where the attacker already holds the keys. The organizing threat model is the
**stolen-phone scenario**: someone has the owner's phone (the admin key). What can they do, and what can
the real owner do to stop them? This produced VFIDE's first **Preparedness Edge Case Matrix**, traced
through the actual access control, and found **two real security defects**, both fixed.

Verified (off-chain layer): frontend typecheck 0, nav 0 broken, **116 tests / 12 suites**, no regression.
The CardBoundVault contract itself can't be compiled here (hardhat blocked) — the fixes are correct by code
inspection; on-chain proof remains the audit gate.

## The two defects found & fixed
### Defect 1 — Instant trustee grant bypassed the timelock (`setTrustee`)
`setGuardian` is correctly guarded: once guardian setup is complete it reverts with `CBV_UseProposeApply`,
forcing all guardian changes through the 24-hour timelocked propose/apply path (so a thief can't instantly
remove guardians — the owner gets a veto window). But `setTrustee` had **no such guard** — it called
`_applyTrusteeChange` instantly even after setup. Trustee status confers **recovery-initiation power**, and
the AdminManager explicitly intends trustee changes to use the same 24h delay (`PendingTrusteeChange`,
`GUARDIAN_CHANGE_DELAY`). This is an inconsistency that weakens the combined "guardian-compromise +
phone-theft" scenario and contradicts the stated design. **Fix:** added the same setup-complete guard to
`setTrustee` — after setup, trustee changes must go through the timelocked `proposeTrusteeChange` /
`applyTrusteeChange` path. (Exploitability was already bounded — a trustee must already be a guardian, and
adding a guardian is timelocked — but the gap was real and is now closed.)

### Defect 2 — Admin could unilaterally lift a guardian-initiated pause (`unpause`)
This is the important one, and the stolen-phone scenario is exactly what surfaced it. The vault's emergency
brake: guardians can `pause()` the vault by threshold approval, which blocks **all** outbound transfers
(`_requireOperationalForOutboundTransfers`). In the stolen-phone case the owner calls their guardians, who
pause the vault to stop the thief. **But `unpause()` was `onlyAdmin` with no record of who paused** — so the
thief, holding the phone (admin), could immediately call `unpause()` and resume draining. The owner's
primary emergency protection could be undone by the very party it defends against; guardians pause, thief
unpauses, repeat.

**Fix (preserving the asymmetry "protection strong, override weak"):**
- Added a `pausedByGuardian` flag: set `true` on a guardian threshold pause, `false` on an admin pause,
  cleared on 7-day expiry and on recovery rotation (the post-recovery pause belongs to the new owner).
- `unpause()` now reverts with `CBV_GuardianPauseActive` if the pause was guardian-initiated — admin can
  lift their own pause, never the guardians' protective one.
- Added `guardianUnpause()` — guardians can lift their own pause by threshold (symmetric with `pause()`),
  so a false alarm clears without waiting the full 7 days, but a single admin/thief still cannot.
- Storage mirrored exactly in the admin facet (delegatecall slot alignment preserved).

## The Preparedness Edge Case Matrix (stolen-phone threat model)
| # | Scenario | Can the attacker? | Protection |
|---|----------|-------------------|------------|
| 1 | Thief drains the vault | **Only up to the daily limit** | Amounts above queue with a 7-day delay; guardians can cancel a queued withdrawal; receiver code-hash checked. Within-daily-limit loss is bounded by design (the user-set limit). |
| 2 | Thief removes guardians | **No** | `setGuardian` is setup-gated; post-setup changes are timelocked 24h — owner sees and cancels (`cancelGuardianChange`). |
| 3 | Thief grants itself trustee power | **No (fixed W86)** | `setTrustee` now setup-gated → 24h timelock; trustee must already be a (timelocked-added) guardian. |
| 4 | Thief changes next-of-kin / heirs | **No** | `proposeInheritanceConfig` is timelocked (`effectiveAt`, `INH_CooldownActive`) and versioned. |
| 5 | Thief changes successors | **No** | Same inheritance/trustee timelocks as #3/#4. |
| 6 | Thief activates continuity / starts recovery | **Starting ≠ taking** | Recovery completion needs guardian-threshold approval AND a rotation timelock (`MIN_ROTATION_DELAY`..`MAX_ROTATION_DELAY` 7d) AND admin separation — the real owner has a veto window. |
| 7 | Thief disables recovery | **No** | Guardian removal/threshold/trustee changes are all timelocked; the owner vetoes. |
| 8 | Thief unpauses to keep draining | **No (fixed W86)** | A guardian pause is no longer admin-liftable. |
| 9 | Real owner remotely locks everything | **Yes** | Guardians `pause()` by threshold → blocks all outbound transfers; now thief-proof. |
| 10 | Owner resumes after a false alarm | **Yes** | `guardianUnpause()` by threshold (added W86), or 7-day expiry, or recovery. |
| 11 | Recovery griefing / spam | **Bounded** | `MIN_CHALLENGE_PERIOD` 3 days, threshold approvals, rotation timelock, pause-nonce prevents replay. |
| 12 | How long does the owner have? | **Days, by construction** | Every sensitive change is on a 24h–7d timelock; the daily limit caps immediate loss; guardians can freeze within minutes. |

## Secondary security layer (audited per the campaign brief)
- A secondary layer exists: `lib/biometricAuth.ts` + `useBiometricAuth` (device biometric gate). This sits
  in front of client actions and raises the bar before the chain is ever touched.
- The **on-chain** protections above are the ones that actually bind an attacker who already holds the key,
  so the matrix is traced against those (a client-side PIN/biometric can't stop someone who extracted the
  key). This is the honest framing: biometrics deter, timelocks + guardians + daily-limit *enforce*.

## What was verified sound (not changed)
- Guardian asymmetry holds and is now complete: **guardians can cancel a withdrawal and pause/unpause by
  threshold; guardians can never redirect funds** to themselves. False-positive protection is strong;
  transfer authority is zero.
- The daily limit + withdrawal queue + receiver code-hash check together bound a key-holding thief to (at
  most) the owner-chosen daily limit, with everything larger vetoable.
- Recovery rotation remains guardian-threshold + timelock gated (verified in W85, unchanged).

## Remaining caveats (honest)
- **On-chain runtime is unproven here.** The two fixes are correct by inspection and the frontend layer is
  green, but CardBoundVault can't be compiled/deployed in this environment. A professional audit + a
  hardhat test exercising the new `pausedByGuardian` / `guardianUnpause` paths remain the real gate. The
  storage insertions were mirrored identically in contract + facet to preserve delegatecall alignment;
  an auditor must confirm slot layout on a real build.
- **`guardianUnpause` is a new contract capability not yet wired into a guardian UI.** The vault's
  pause/unpause is not currently surfaced in a guardian console at all (pre-existing) — surfacing the whole
  emergency-pause flow (pause approval + guardianUnpause) is legitimate follow-on UI work, flagged not
  forced, to avoid scope creep in a security-focused wave.
- Within-daily-limit loss to a key-holding thief is bounded but non-zero by design — the user sets the
  limit. This is the correct trade (a non-custodial vault can't both let the owner spend and stop a
  key-holder spending the same allowance); the matrix states it plainly rather than implying zero loss.

## Completion decision
**Recovery earns ✅ COMPLETE (off-chain) / 🔒 contract audit gate** — it survived a scenario-driven
adversarial audit that found two real security defects (instant trustee grant, admin override of guardian
pause), both fixed while preserving the protection-strong/authority-weak asymmetry, with the full
stolen-phone matrix traced against the code. The honest limit is the contract-audit gate.

## Next
Per the planned sequence: **Wave 87 — Guardian Institution Campaign** (guardian disappearance/death/
collusion edge cases), then Continuity (88), Successors & Emergency Operators (89), and the **Preparedness
Civilization Audit** (90).
