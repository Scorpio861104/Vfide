# VaultRecoveryClaim — Contract-to-Frontend Audit

**Date.** 2026-05-15
**Contract LOC.** 860
**Source-side functions.** 22 (verified, plus 8 inherited from custom Ownable in SharedInterfaces.sol)
**ABI entries.** 66 (30 functions + 36 state-variable getters)
**Frontend files consuming ABI.** 1 (`hooks/useRecoveryBeacon.ts` — event watching only)

**Verdict at a glance. 🔴 CRITICAL FINDING.** The entire `VaultRecoveryClaim` contract surface is unreachable from the frontend. No code calls `initiateClaim`, `guardianVote`, `verifierVote`, `challengeClaim`, or `finalizeClaim`. The contract works, the threat model is sound, my R-8 additions function correctly — but none of it is exposed to users via UI. A user attempting to recover their vault using the rich recovery flow has no path to do so.

---

## Section 1: ABI completeness

**Result.** 0 source functions missing from ABI. The ABI is current and complete.

**Surprise note.** My initial source-function enumeration missed 8 functions because they're inherited from a custom `Ownable` defined in `SharedInterfaces.sol` (not the OpenZeppelin one). This custom Ownable adds an emergency-controller pattern with 48-hour timelock and an emergency-ownership-transfer mechanism with 24-hour timelock + 2-step accept. All audited (H-14 FIX, M-12 FIX visible in comments). This is the *administrative* ownership of the recovery contract itself (different from user vault ownership). The frontend uses one of these (`transferOwnership`) which is appropriate.

---

## Section 2: Frontend usage — what's actually wired

### Files using VaultRecoveryClaim ABI

Only **one file** imports the ABI: `hooks/useRecoveryBeacon.ts`.

```ts
import VaultRecoveryClaimABI from '@/lib/abis/VaultRecoveryClaim.json';
```

### What useRecoveryBeacon does

It's a **passive event watcher** — `useWatchContractEvent` subscribes to `ClaimInitiated`, `ClaimExecuted`, `ClaimRejected`, `ClaimExpired` so that if a guardian is anywhere in the app and one of their vaults enters recovery, the beacon UI lights up.

It does NOT call any function on the contract. It only reads events.

### Functions called from frontend: 0

Cross-referenced every external/public function against frontend code, with multiple search patterns (`functionName: 'xxx'`, `writeContract`, `readContract`):

- `initiateClaim` — 0 callers
- `initiateClaimByRecoveryId` — 0 callers
- `guardianVote` — 0 callers
- `verifierVote` — 0 callers
- `challengeClaim` — 0 callers
- `finalizeClaim` — 0 callers
- `expireClaim` — 0 callers
- `recordVaultActivity` — 0 callers
- `getClaim` — 0 callers
- `canFinalize` — 0 callers
- `challengeTimeRemaining` — 0 callers

Plus all administrative functions (`setVaultHub`, `setVaultRegistry`, `setTrustedVerifier`, and the OZ-style ownership functions) — none called from the frontend, but these are intentionally admin-via-Etherscan.

### What the user-facing UI actually does

There is a route `/vault/recover` (`app/vault/recover/page.tsx`, 255 lines) which appears to be the recovery UI. It uses `VaultRegistry` (for search) and `Seer` (for score display), but **not** `VaultRecoveryClaim`.

The route has a `ClaimFlowModal` component (314 lines) that walks the user through a multi-step "claim this vault" UI. The modal:
- Collects recovery ID and reason from the user
- Has 3 steps with "Continue" buttons
- Contains **zero contract calls** (`writeContract`, `readContract`, `useReadContract`, `useWriteContract` — none present)
- On final step, the modal closes — nothing happens on-chain

**A user walking through the recovery UI today completes the flow with no on-chain effect.**

---

## Section 3: The architectural picture

There appear to be **two parallel recovery systems** in the protocol:

### Path A: "Wallet rotation" recovery (currently wired)
- Frontend: `hooks/useVaultRecovery.ts`
- Vault functions: `proposeWalletRotation` → `approveWalletRotation` → `finalizeWalletRotation` → `executeRecoveryRotation`
- Surfaced in: `/vault/recover` (?) , `LockVaultPanel`, `GuardianPendingRecoveryCard`
- Mechanics: Simpler. Guardian-approval-only. No verifier votes, no claim reasoning, no challenge window state machine.
- Status: ✅ wired up

### Path B: "Recovery claim" comprehensive (NOT wired)
- Frontend: nothing connects to it
- Contract: `VaultRecoveryClaim` — full state machine (Pending → GuardianApproved → Challenged → Approved → Executed)
- Features: identity evidence hashes, claim reasoning, verifier voting, challenge window with configurable preference (R-8), per-initiator cooldown (R-8), trustee-gated initiation (R-8), activity-based window extension
- Status: 🔴 unreachable

Both paths converge at `VaultHub.executeRecoveryRotation` which finalizes the wallet rotation on the vault. But the entry points and the user experience are entirely different.

---

## Section 4: Findings

### 🔴 H-VRC-01: VaultRecoveryClaim contract is unreachable from the frontend. CRITICAL.

The contract exists, has been audited multiple times, has my R-8 additions, has 22 external/public functions, and has 0 callers in the frontend. The rich recovery flow this contract was built to support — guardian voting, verifier voting, challenge windows, trustee-initiated recovery, configurable challenge periods, claim reasoning, identity evidence — has no UI.

**Impact.** Users who want the comprehensive recovery flow cannot use it. The `/vault/recover` UI walks them through a flow that does nothing on-chain. The R-8 work (which we deliberately built for testnet reveal as the strong recovery story) has zero user surface.

**Possible interpretations:**

1. **VaultRecoveryClaim is deprecated in favor of wallet rotation.** Path A is the actual recovery system; Path B is leftover scaffolding from an earlier architectural attempt. If so: the contract should be removed before deployment, and the audit work, threat model entries, R-8 additions, and tests should all be deleted or migrated.

2. **VaultRecoveryClaim is the strategic recovery system; Path A is a stopgap.** Path B was built but never wired to UI because the UI work fell behind. If so: this is the single largest piece of frontend work outstanding. Wiring it up is reveal-critical because it's the recovery story the protocol was designed to tell.

3. **Both are intended to coexist for different use cases.** Maybe Path A is for "simple lost device, primary user," Path B is for "comprehensive recovery with social attestation." If so: the UI should make the distinction clear and let users choose.

**This is the most important architectural question in the entire audit so far.** Before any more work, this needs to be answered.

### ✅ H-VRC-02: `ClaimFlowModal` is non-functional UI scaffolding. CLOSED Phase 1 Turn 2.

`app/vault/recover/components/ClaimFlowModal.tsx` was a 314-line component that presented a multi-step "claim this vault" UI to users with zero contract interaction code.

**Fix applied.** Phase 1 Turn 2 (2026-05-15): wired the modal to call `useRecoveryClaim.initiateByRecoveryId` on the step 2→3 transition. The "Submit Recovery Claim" button now actually submits the claim on-chain. Loading state, error display, tx hash display all added.

### ✅ M-VRC-01: R-8 additions have no frontend consumer. CLOSED Phase 1.

R-8 work (trustee gating, per-initiator cooldown, configurable challenge period) now has full frontend consumer:
- Trustee management UI in `MyGuardiansTab` (Turn 5) — propose, apply, cancel, per-guardian badge, count stat
- Challenge-period preference page at `/vault/safety/window` (Turn 6) — preset + custom value, bounds validation, admin gating
- Per-initiator cooldown surfaces as a clean error message in `ClaimFlowModal` (no separate UI needed; the error is shown inline when initiate fails with InitiatorCooldownActive)

### 🟡 M-VRC-02: My R-8 tests cannot fully verify the integration.

The R-8 test file (`test/hardhat/CardBoundVaultRecovery.r8.test.ts`) exercises the contract logic in isolation. It cannot test the integration to a frontend that doesn't exist. The full end-to-end "user initiates → guardians approve → owner doesn't veto → recovery completes" is testable on-chain but won't be reachable in the production app until the frontend is built.

### 🟢 L-VRC-01: One verified-clean path — the recovery beacon.

`useRecoveryBeacon` properly subscribes to events on `VaultRecoveryClaim`. If/when the contract becomes reachable, the beacon will correctly light up for guardians whose vaults enter recovery. This piece is solid.

---

## Section 5: Recommendations

### Reveal-blocking decisions needed

**Decision 1: Path A vs. Path B.** Before further work on either, decide which recovery system is the strategic one for testnet reveal. Both can't be supported as is — the existence of two parallel flows confuses users and creates audit complexity.

**Decision 2: If Path B is strategic, wire it.** This is a significant frontend project. Building the hooks (`useRecoveryClaim` with `initiateClaim`, `useGuardianVote`, `useChallengeClaim`, `useFinalizeClaim`) plus the matching UI states across the `/vault/recover` flow, the guardian dashboard, and the owner's pending-recovery view. Probably 600-1000 lines.

**Decision 3: If Path A is strategic, remove Path B.** Delete `VaultRecoveryClaim.sol`, its tests, my R-8 work, the threat model R-8 entry. Simplify the protocol surface. Better than carrying unreachable code into mainnet.

### Action regardless of decision

- The `ClaimFlowModal` UI scaffolding must either be wired or removed. Shipping it as-is is the worst option (user trap).

---

## Reflection

The R-8 work I built in earlier turns was sound contract design — well-commented, well-tested, threat-model-documented. But I built it on top of contract surface that had no frontend, and I didn't notice. That's a real failure of the original audit-by-skim approach.

The contract-to-frontend mapping pattern is the right tool for catching this. One pass of cross-referencing surface vs. consumer reveals what days of code review on either side individually would miss.

I want to be honest: I should have caught this before adding R-8 features. Adding more surface to an unreachable contract was wasted work in user-facing terms (though the threat-model exercise and code-design exercise had value independently).

The right next step is the architectural decision in Section 5, not more contract work.
