# VFIDE Inheritance — Threat Model

**Date:** 2026-05-14
**Scope:** `CardBoundVaultInheritanceManager.sol`, the inheritance facade on `CardBoundVault.sol`, and the inheritance-aware surface of `VaultHub.sol`.
**Methodology:** Microsoft STRIDE per category (Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege), organized function-by-function for audit utility. STRIDE cross-reference table is in Part 7.
**Companion doc:** `VFIDE_INHERITANCE_DESIGN.md` (design specification).

This document is the source of truth for what the inheritance code is **defended against** and what it is **not**. Auditors should read this first, then the design doc, then the contract.

---

## Part 1 — Conventions

### Severity grades

| Grade | Meaning |
|---|---|
| **Critical** | Loss of funds, irrecoverable. Mitigation must be enforced in code, not policy. |
| **High** | Loss of funds, recoverable through governance or replay protection. |
| **Medium** | Loss of fairness (one heir gets more than they should, but no fund loss in aggregate). |
| **Low** | UX harm, accidental denial of service, gas waste. |

### Attacker models

Throughout this document, "attacker" means one of:

- **A-OWNER:** Owner has been compromised — attacker holds the active admin wallet key for some bounded window.
- **A-GUARDIAN:** A single guardian has been compromised or is malicious.
- **A-HEIR:** A configured heir is malicious or has been compromised.
- **A-MAJORITY:** All or M-of-N guardians colluding.
- **A-EXTERNAL:** Anyone with chain access but no privileged role on this vault.
- **A-DAO:** The DAO guardian role, if registered as one of the vault's guardians.

### Asset taxonomy

| Asset | What it is | Loss model |
|---|---|---|
| **Vault balance** | The VFIDE tokens in the deceased's vault | Irrecoverable if transferred to wrong party |
| **Heir secret** | 32-byte preimage held by each heir | Loss = heir cannot claim their share |
| **Inheritance config** | (heir guardians, commitments) on chain | Manipulation = wrong heirs or wrong shares |
| **Owner liveness signal** | The ability to assert the owner is alive | Censorship = forced inheritance |
| **Time** | The 30/90/365-day windows | Compression = premature claim, extension = funds stuck |

### State machine vocabulary

The five states from the design:

| Code | Name | Duration | Entry trigger | Exit trigger |
|---|---|---|---|---|
| 0 | `STATE_NORMAL` | indefinite | (initial) | guardian calls `initiateInheritanceClaim` |
| 1 | `STATE_VETO_PERIOD` | 30 days | claim initiated | M-of-N veto OR owner override OR window expires |
| 2 | `STATE_CLAIM_WINDOW` | 90 days | veto window expires with no veto/override | all heirs reveal OR window expires |
| 3 | `STATE_MEMORIAL` | 365 days | distribution finalized OR claim window expires with no reveals | window expires + `cleanupMemorialVault()` called |
| 4 | `STATE_CLOSED` | terminal | cleanup called after memorial | (terminal) |

---

## Part 2 — Trust model

The inheritance system inherits the trust model of CardBoundVault. To restate concretely:

1. The **owner** (admin wallet) is fully trusted while not compromised. They can change inheritance config, set the POL wallet, and cancel any pending change during the 30-day cooldown.
2. **Guardians** are individually distrusted but collectively trusted at the M-of-N veto threshold. A single guardian can initiate inheritance, but a single guardian cannot complete one (the veto + cooldown gates apply).
3. **Heirs** are trusted only with their own share. They prove entitlement by possessing the heir secret and revealing it during the claim window. They are individually distrusted relative to each other (their shares are mutually hidden until reveal).
4. **The POL wallet**, if set, has exactly one privilege: cancel an active inheritance claim. No transfer power, no admin power.
5. **The DAO**, if a registered guardian, can VETO but cannot INITIATE (per design Decision 12).
6. **A-EXTERNAL** has zero privileges. The only externally-callable functions that take no privileged caller are `finalizeInheritanceDistribution` (anyone can finalize, but the result is deterministic) and `cleanupMemorialVault` (anyone can cleanup after the memorial period, no funds are moved).

The system is **non-custodial**: the manager contract holds no admin keys, no upgrade keys, no pause keys. All authority is per-vault, per-guardian, per-heir, with on-chain enforcement.

---

## Part 3 — Global invariants

These invariants hold across every state, every function, every interaction. Each is testable, and Part 8 maps each to its test case.

### INV-1: Single inheritance flow at a time

For any vault: at most one inheritance claim is active at any moment. The `inheritanceStateValue` is a single uint8; there is no parallel state. Initiation while not-NORMAL reverts.

### INV-2: Recovery and inheritance are mutually exclusive

`executeRecoveryRotation` reverts if `inheritanceStateValue != STATE_NORMAL`. `initiateInheritanceClaim` reverts if `pendingRecoveryRotation == true`. Neither flow can begin while the other is in progress.

### INV-3: Outbound transfers blocked once claim is initiated

`_requireOperationalForOutboundTransfers()` is called by every fund-egress function on the vault. It reverts when state != NORMAL. This blocks queued-payment execution, withdrawal-queue release, escrow funding, etc. Funds remain pooled until distribution.

### INV-4: Config version monotonicity

`inheritanceConfigVersion` is strictly increasing with each confirmed config. Old commitments hashed against a previous version cannot validate against the new version. Replay-after-rotation is impossible.

### INV-5: Heir uniqueness per slot

Within one confirmed configuration, each heir guardian address appears at most once. Enforced at `confirmInheritanceConfig` time by index-walking validation.

### INV-6: Basis point sum

After distribution finalization, `sum(finalBasisPointsByNonce[nonce][revealer] for all revealers) == TOTAL_BASIS_POINTS (10000)` if at least one heir revealed. Forfeited share is implicit in the redistribution.

### INV-7: Snapshot immutability

Once `initiateInheritanceClaim` is called, the snapshotted authority (`snapshotOwnerAdmin`, `snapshotProofOfLifeWallet`, `snapshotVetoThreshold`) and guardian set are immutable for that claim instance. Live state mutations (e.g., adding a new guardian) do not affect the active claim.

### INV-8: Withdraw-once per heir per claim

`consumeHeirPayout` marks the heir's `finalPayoutAmountByNonce[nonce][heir] = 0` after consumption. A second call returns `(0, finalBps, false)` and emits no further state change.

### INV-9: Payout cap

`sum(payouts) <= payoutBalance`. Enforced by computing payouts proportionally with a last-revealer-gets-remainder pattern (no rounding leak, no rounding loss).

### INV-10: Memorial timeout

`cleanupMemorialVault` reverts if `block.timestamp < inheritanceStateWindowEnd` while in MEMORIAL state. The 1-year delay is not bypassable by any actor.

---

## Part 4 — Per-function threat enumeration

For each external entry point on the inheritance manager (called through the vault facade unless noted), we enumerate: preconditions, postconditions, named threats, mitigations, residual risk, test references. Test IDs are in the form `T-NN` and resolve in Part 8.

### 4.1 `proposeInheritanceConfig(actor, heirGuardians[], commitments[])`

**Caller:** vault facade only (`onlyVault`). Vault enforces `onlyAdmin` so `actor == admin`.
**Preconditions:**
- No pending config change is in progress (`pendingHeirConfigEffectiveAt == 0`).
- `heirGuardians.length <= 5`, `commitments.length == heirGuardians.length`, `>= 1`.
- All `heirGuardians[i]` are non-zero and unique within the array.
- All `heirGuardians[i]` are currently registered guardians on the vault.

**Postconditions:**
- `pendingHeirCount`, `pendingHeirGuardianByIndex`, `pendingHeirCommitmentByIndex` are written.
- `pendingHeirConfigEffectiveAt = block.timestamp + INHERITANCE_CONFIG_COOLDOWN (30 days)`.
- `pendingConfigVersion = inheritanceConfigVersion + 1`.
- `pendingConfigHash` is a defensive hash of the pending arrays + version, used to detect tampering.
- `InheritanceConfigProposed` event emitted.

**Threats:**

| ID | Threat | Severity | Mitigation |
|---|---|---|---|
| T-PROP-1 | A-OWNER (compromised key) proposes attacker's address as heir | Critical | 30-day cooldown gives owner time to notice + cancel. Event emitted to guardian channels for off-chain alerting. (Design Decision 4.) |
| T-PROP-2 | A-OWNER proposes a non-guardian heir | Medium | Reverts: heir-must-be-guardian check at proposal time. Forces explicit guardian-add first. |
| T-PROP-3 | A-OWNER proposes duplicate heir slot | Low | Reverts: uniqueness check at proposal time. |
| T-PROP-4 | A-OWNER proposes more than 5 heirs | Low | Reverts: `MAX_HEIRS = 5` check. |
| T-PROP-5 | A-OWNER stacks a proposal during an active claim | Medium | Proposing during VETO/CLAIM/MEMORIAL reverts (`INH_WrongState`). The claim uses snapshotted authority anyway, so even if it succeeded the active claim would be unaffected. |
| T-PROP-6 | A-OWNER proposes with mismatched array lengths | Low | Reverts: explicit `commitments.length == heirGuardians.length` check. |
| T-PROP-7 | A-OWNER proposes empty heir list | Low | Use `clearAllHeirs` instead. Reverts on empty array. |

**Residual risk:** If the owner key is compromised and the attacker proposes a self-heir AND the owner does not notice within 30 days AND no guardian initiates a recovery, the malicious config confirms. This is the irreducible cost of permitting heir changes. Mitigated by event emission to off-chain alerting channels and by the design's heir-must-be-guardian rule (the attacker must also be a guardian, which is itself a guarded process).

**Tests:** T-01 (positive), T-02 (non-guardian heir), T-03 (duplicate), T-04 (over-5), T-05 (active-claim block), T-06 (mismatched lengths), T-07 (empty).

### 4.2 `confirmInheritanceConfig(actor)`

**Caller:** vault facade only (`onlyVault`). Vault enforces `onlyAdmin`.
**Preconditions:**
- `pendingHeirConfigEffectiveAt > 0` (a proposal exists).
- `block.timestamp >= pendingHeirConfigEffectiveAt` (cooldown elapsed).
- All pending heir guardians are still registered guardians at confirm time (not just at propose time).

**Postconditions:**
- `inheritanceConfigVersion = pendingConfigVersion`.
- Active heir slots are overwritten with the pending values.
- Pending state is cleared.
- `InheritanceConfigConfirmed` event emitted.

**Threats:**

| ID | Threat | Severity | Mitigation |
|---|---|---|---|
| T-CONF-1 | A-OWNER tries to confirm before cooldown | Low | Reverts (`INH_CooldownActive`). |
| T-CONF-2 | A heir guardian was removed between propose and confirm | Medium | Re-check at confirm time; reverts if any pending heir guardian is no longer a guardian. Prevents commitment-with-dead-heir. |
| T-CONF-3 | Stale pending state from old proposal blocks new one | Low | `cancelInheritanceConfigChange` is always callable by owner. Documented. |
| T-CONF-4 | A-OWNER confirms during VETO/CLAIM window | Medium | State-machine check reverts. |

**Residual risk:** If owner re-confirms after a 30-day attacker window has passed and the owner has not noticed the malicious proposal, the attacker's config becomes active. Same residual as T-PROP-1; the confirm step is not a new mitigation, it's a delay.

**Tests:** T-08 (positive), T-09 (premature), T-10 (guardian-removed-between), T-11 (during active claim).

### 4.3 `cancelInheritanceConfigChange(actor)` / `cancelInheritanceConfigChangeByGuardians(actor)`

**Owner path — `cancelInheritanceConfigChange`:**
**Caller:** vault facade only. Vault enforces `onlyAdmin`.

**Guardian-quorum path — `cancelInheritanceConfigChangeByGuardians`:** ✅ implemented (R-1 closed). Vault enforces `onlyGuardian`. The manager additionally checks `_isGuardian(actor)` against the live guardian set, ensures a pending proposal exists, and tracks one vote per guardian per `pendingConfigVersion`. When the count reaches the current `_guardianThreshold()`, the pending state is cleared.

**Threats:**

| ID | Threat | Severity | Mitigation |
|---|---|---|---|
| T-CXL-1 | A-OWNER cancels a proposal they didn't make | n/a | Cancelling your own proposal is the intended behavior. No prevention needed. |
| T-CXL-2 | A-GUARDIAN cancels owner's legitimate proposal solo | Medium | Single guardian vote does not cancel — requires the full M-of-N threshold. See R-1 (closed). |
| T-CXL-3 | Same guardian double-votes to cancel | Low | `hasVotedToCancelByPendingVersion[version][actor]` flag — reverts on second vote. |
| T-CXL-4 | Guardian votes on a non-existent proposal | Low | Reverts (`INH_NoPendingConfig`). |

### 4.4 `clearAllHeirs(actor)`

**Caller:** vault facade only. Vault enforces `onlyAdmin`.
**Preconditions:** None — but a 30-day cooldown applies (same as `proposeInheritanceConfig` with zero heirs).

**Threats:** Same as T-PROP-1 (compromised key clears heirs → vault becomes uninheritable). Mitigated by the same 30-day cooldown + event emission.

**Tests:** T-12 (positive), T-13 (cooldown enforcement).

### 4.5 `setProofOfLifeWallet(actor, polWallet)`

**Caller:** vault facade only. Vault enforces `onlyAdmin`.
**Preconditions:** None. Setting to `address(0)` clears the POL wallet.

**Threats:**

| ID | Threat | Severity | Mitigation |
|---|---|---|---|
| T-POL-1 | A-OWNER (compromised) clears POL to silence owner's override path | High | No cooldown by design — a POL change must be instant to be useful in emergencies. Mitigation is OFF-CHAIN: owner notices via event and re-asserts. **This is a real gap** if owner key is silently compromised. See R-2. |
| T-POL-2 | A-OWNER sets POL to attacker's address | High | Same as T-POL-1 — instant, no cooldown. R-2. |
| T-POL-3 | POL wallet is used to drain vault | n/a | Not a privilege of POL. POL can only call `ownerOverrideClaim`. |

**Residual risk (R-2):** A silent compromise of the owner key can remove or relocate the POL wallet. The owner discovers this only if they review their own vault state, which is asymmetric defense. Mitigated by: (a) event emission to alerting channels, (b) the design's recommendation that the POL key is held by someone trusted (the same someone who knows when to alert the family). If perfect, this becomes a multi-party compromise scenario.

**Acceptance:** The design accepts T-POL-1/2 as residual. Adding a cooldown on POL changes would make the POL wallet unusable for its primary purpose (instant cancel during a stressful event).

**Tests:** T-14 (positive set), T-15 (clear), T-16 (POL has no transfer power).

### 4.6 `initiateInheritanceClaim(actor, reasonHash)`

**Caller:** vault facade only. Vault enforces `onlyGuardian`.
**Preconditions:**
- `inheritanceStateValue == STATE_NORMAL`.
- `pendingRecoveryRotation == false` (no recovery in progress).
- `heirCount > 0` (vault is inheritable).
- The vault is not paused for unrelated reasons.

**Postconditions:**
- `inheritanceStateValue = STATE_VETO_PERIOD`.
- `inheritanceStateWindowEnd = block.timestamp + 30 days`.
- `inheritanceInitiator = actor`.
- `inheritanceReasonHash = reasonHash`.
- `claimConfigVersion = inheritanceConfigVersion` (snapshot).
- Snapshot authority: `snapshotOwnerAdmin`, `snapshotProofOfLifeWallet`, `snapshotVetoThreshold`, and the snapshot guardian set are written.
- `inheritanceClaimNonce += 1` so per-claim mappings (votes, reveals) are isolated.
- `InheritanceClaimInitiated` event emitted.

**Threats:**

| ID | Threat | Severity | Mitigation |
|---|---|---|---|
| T-INIT-1 | A-GUARDIAN (single, malicious) initiates a false claim | Critical | 30-day veto window + M-of-N veto + owner override. Initiator's address is on chain so reputational cost is real. |
| T-INIT-2 | A-GUARDIAN initiates during active recovery | High | Reverts (`INH_RecoveryInProgress`). Recovery has priority. |
| T-INIT-3 | A-GUARDIAN initiates while paused | High | Reverts (`INH_VaultPaused`). Inheritance respects existing pause semantics. |
| T-INIT-4 | A-GUARDIAN re-initiates after a previous claim was vetoed | Medium | After veto, state returns to NORMAL with cleared snapshot. New initiation is permitted, but the cycle is loud (events emitted). Mitigation is social: repeat false initiations harm the initiator's standing. |
| T-INIT-5 | A-EXTERNAL initiates | Low | Reverts (`INH_NotGuardian`) at the vault facade. |
| T-INIT-6 | A-HEIR initiates (without being a guardian) | Low | Reverts (`INH_NotGuardian`). Heirs are guardians, but initiation right is the guardian role, not the heir role — both are required only at later steps. |
| T-INIT-7 | A-DAO initiates | High | DAO guardian's initiate call is rejected by the `daoGuardian != address(0) && actor == daoGuardian` check after `_isGuardian(actor)` per design Decision 12. ✅ Closed (R-3). |
| T-INIT-8 | Reason hash is bogus / unverifiable | Low | The hash is opaque to the contract; verification happens off-chain. The point of including it is to make false initiations a public commitment to a story that won't hold up. |

**Residual risk:** A single malicious guardian can initiate a false claim. They cannot complete it without (a) the owner failing to override AND (b) other guardians failing to veto. The 30-day window is calibrated to give the owner time to wake from a coma, complete a sentence, or return from a retreat. Below that floor, the owner is presumed dead by social signal — which is the entire point of the system.

**Tests:** T-17 through T-24 (each threat above).

### 4.7 `vetoInheritanceClaim(actor)`

**Caller:** vault facade only. Vault enforces `onlyGuardian`. **In addition**: the manager checks `actor` was a guardian at snapshot time (`snapshotGuardian[actor] == true`), not just currently. Per INV-7.
**Preconditions:**
- `inheritanceStateValue == STATE_VETO_PERIOD`.
- `block.timestamp < inheritanceStateWindowEnd`.
- `actor` has not already vetoed this claim instance (`guardianVetoedAtNonce[actor] != inheritanceClaimNonce`).

**Postconditions:**
- `guardianVetoedAtNonce[actor] = inheritanceClaimNonce`.
- `vetoCount += 1`.
- If `vetoCount >= snapshotVetoThreshold`: state returns to NORMAL, snapshot cleared.
- `InheritanceClaimVetoed` event emitted (with current count).

**Threats:**

| ID | Threat | Severity | Mitigation |
|---|---|---|---|
| T-VETO-1 | A guardian added AFTER initiation tries to veto | Medium | Snapshot guardian set check rejects (`INH_GuardianSnapshotOnly`). Prevents post-init manipulation. |
| T-VETO-2 | The initiator vetoes their own claim | n/a | Allowed by design — counts toward the threshold. Equivalent to retracting. |
| T-VETO-3 | A guardian double-vetoes | Low | Reverts (`INH_InsufficientGuardianApprovals` or equivalent). The `guardianVetoedAtNonce` check enforces single vote per claim instance. |
| T-VETO-4 | A-MAJORITY all veto a legitimate claim | High | Possible by definition of M-of-N. This is the cost of the M-of-N model — the same trust that lets guardians initiate also lets them block. Per design Decision 12, the DAO veto is the backstop here. |
| T-VETO-5 | Veto after window expired | Low | Reverts (state has rolled over to CLAIM_WINDOW). |

**Residual risk:** M-of-N guardian collusion can block any inheritance claim. The DAO veto is the backstop but only blocks bad initiations, not bad vetoes. **A vault whose entire guardian set is compromised loses inheritance.** Mitigation: choose guardians from disjoint trust circles.

**Tests:** T-25 through T-29.

### 4.8 `ownerOverrideClaim(actor)`

**Caller:** vault facade only. Vault does NOT enforce a role — the manager checks `actor == snapshotOwnerAdmin || actor == snapshotProofOfLifeWallet`.
**Preconditions:**
- `inheritanceStateValue == STATE_VETO_PERIOD`.
- `block.timestamp < inheritanceStateWindowEnd`.

**Postconditions:** Same as full veto threshold met — state returns to NORMAL, snapshot cleared.

**Threats:**

| ID | Threat | Severity | Mitigation |
|---|---|---|---|
| T-OVR-1 | A-EXTERNAL calls override | Low | Reverts (`INH_NotOwner`). |
| T-OVR-2 | A-OWNER (post-compromise) overrides a legitimate claim to keep stealing | High | Owner's authority by definition includes override. There is no way to deprive a non-compromised owner of override authority. The vault's own recovery flow is the remediation if the owner key is actually lost. |
| T-OVR-3 | POL wallet calls override | n/a | Allowed by design. The POL was set for exactly this case. |
| T-OVR-4 | Override after window expired | Low | Reverts. The owner had 30 days and didn't act. |
| T-OVR-5 | Override during CLAIM_WINDOW (after veto period passed) | Medium | Reverts (`INH_WrongState`). The owner missed their window. Documented behavior. The reveal-and-distribute machinery is now in motion. |

**Residual risk:** None new — T-OVR-2 is the irreducible cost of having an owner-override path. The design accepts it because the alternative (no override) is worse for the premature-claim threat.

**Tests:** T-30 through T-34.

### 4.9 `claimHeirShare(actor, heirSecret, basisPoints)`

**Caller:** vault facade only. Vault enforces `nonReentrant`. No role check at the vault level — the manager validates that `actor` has a commitment in the active config.
**Preconditions:**
- `inheritanceStateValue == STATE_CLAIM_WINDOW`.
- `block.timestamp < inheritanceStateWindowEnd`.
- `heirCommitmentByGuardian[actor] != 0` (actor was a configured heir at the snapshot config version).
- `!hasRevealedClaim(actor)` for the current nonce.
- The computed commitment `keccak256(domain, chainid, vault, claimConfigVersion, actor, basisPoints, heirSecret)` matches `heirCommitmentByGuardian[actor]`.
- The computed commitment hash is not in `claimedHashes` (prevents commitment-hash reuse across configs).

**Postconditions:**
- `claimedHashes[computedHash] = true`.
- `revealedByNonce[nonce][actor] = true`.
- `revealedBasisPointsByNonce[nonce][actor] = basisPoints`.
- `revealersByNonce[nonce].push(actor)`.
- `totalRevealedBasisPoints += basisPoints`.
- If `totalRevealedBasisPoints >= TOTAL_BASIS_POINTS`: auto-rollover to allow immediate finalize.
- `HeirClaimRevealed` event emitted.

**Threats:**

| ID | Threat | Severity | Mitigation |
|---|---|---|---|
| T-CLM-1 | A-EXTERNAL guesses a heir secret | Critical | 32-byte (256-bit) secret with domain separation. Brute force infeasible. |
| T-CLM-2 | A-HEIR claims a different share than agreed | Critical | Commitment is `keccak256(domain || chainid || vault || version || heir || bps || secret)`. Changing `bps` produces a different hash; reveal would fail commitment match. |
| T-CLM-3 | A-HEIR claims twice (reveal-replay) | High | `revealedByNonce[nonce][actor]` flag + `claimedHashes[hash]` flag. Two layers of replay protection. |
| T-CLM-4 | A-HEIR claims with a stale config-version commitment | High | Commitment hash binds `claimConfigVersion`. Old commitments hash differently. |
| T-CLM-5 | A-EXTERNAL front-runs an heir's reveal tx | Critical | The commitment binds the heir address (`msg.sender`). A front-runner would have to submit a tx from the heir's own address — they cannot. |
| T-CLM-6 | A-HEIR reveals from a different wallet than configured | High | Commitment binds `actor == msg.sender`. Reveal from a different wallet hashes differently and fails. |
| T-CLM-7 | A-HEIR reveals after window expired | Medium | Reverts (`INH_WrongState` if state rolled to MEMORIAL; otherwise CLAIM_WINDOW check). Heir forfeits to revealers. |
| T-CLM-8 | A-HEIR reveals during VETO_PERIOD | Low | Reverts — state hasn't rolled yet. |
| T-CLM-9 | Bps > TOTAL_BASIS_POINTS submitted | Low | Implicit bound: a hash with bps > 10000 cannot match any valid commitment since owner couldn't construct one (validated at proposal time). |

**Residual risk:** If an heir loses their envelope, they cannot claim. Documented in the design. The 90-day window + redistribute-to-revealers pattern partially mitigates by ensuring the funds don't get stuck.

**Tests:** T-35 through T-43.

### 4.10 `finalizeInheritanceDistribution()`

**Caller:** vault facade. Permissionless — anyone can finalize once preconditions hold.
**Preconditions:**
- `inheritanceStateValue == STATE_CLAIM_WINDOW`.
- Either `block.timestamp >= inheritanceStateWindowEnd` OR `revealersByNonce[nonce].length == heirCount` (all heirs revealed).
- `!distributionFinalized`.

**Postconditions:**
- `payoutBalance = IERC20(vfideToken).balanceOf(vault)` (snapshot).
- `PendingObligationsSettled(0, 0, 0)` event emitted (current v1 placeholder; see R-4).
- Each revealer's `finalBasisPointsByNonce` and `finalPayoutAmountByNonce` are computed:
  - Proportional share: `revealedBps[i] / totalRevealedBasisPoints * 10000` for finalBps.
  - Last revealer gets `TOTAL_BASIS_POINTS - sum_of_others_finalBps` to absorb rounding remainder.
  - Same pattern for `payoutAmount`.
- If zero heirs revealed: skip distribution math, move to MEMORIAL directly.
- `distributionFinalized = true`.
- `InheritanceDistributionFinalized(totalRevealed, forfeited)` event emitted.
- State rolls to MEMORIAL with `inheritanceStateWindowEnd = block.timestamp + 365 days`.
- `VaultEnteredMemorial` event emitted.

**Threats:**

| ID | Threat | Severity | Mitigation |
|---|---|---|---|
| T-FIN-1 | A-EXTERNAL finalizes prematurely | Low | Reverts (`INH_CooldownActive`) if window not elapsed and not all heirs revealed. |
| T-FIN-2 | Double-finalize | Low | `distributionFinalized` flag prevents. |
| T-FIN-3 | Rounding leaks | Medium | Last-revealer-gets-remainder pattern ensures `sum(payouts) == payoutBalance` exactly. No leak. |
| T-FIN-4 | Snapshot balance manipulated between reveal phase end and finalize | High | The vault's `_requireOperationalForOutboundTransfers` blocks outbound transfers in CLAIM_WINDOW. Balance can only INCREASE between window and finalize (inbound is fine). No party can drain the vault before finalize. |
| T-FIN-5 | Finalize while obligations are unresolved (escrows / loans / subs) | High → Medium | Current v1: obligations remain in their other contracts. The vault balance reflects what's actually inside the vault. External obligations are out-of-scope for v1 settlement. See R-4. |
| T-FIN-6 | totalRevealedBasisPoints > TOTAL_BASIS_POINTS via collusion | Critical | Each commitment was verified at reveal time to match the owner's original commitment. Owner enforces sum=10000 at proposal. Therefore sum of all valid reveals can never exceed 10000. |
| T-FIN-7 | Finalize during recovery rotation | n/a | Recovery is blocked by inheritance state (INV-2). Cannot interleave. |

**Residual risk (R-4):** External obligations (escrows, loans, subscriptions) are not force-settled by `finalizeInheritanceDistribution` in v1. The vault's outbound-transfer guard ensures funds cannot leak from the vault while inheritance is in flight, but it does not unwind existing positions. This is acceptable for v1 because: (a) escrows have their own timeout-based resolution paths, (b) loans accrue interest the heirs inherit alongside the principal — distributable obligations transfer to the heirs' vaults as net liabilities the lender must pursue downstream, (c) subscriptions are cancelled effectively when the vault stops paying. Out-of-scope for v1; documented in design.

**Tests:** T-44 through T-50.

### 4.11 `withdrawFinalHeirPayout()` (vault facade) / `consumeHeirPayout(actor)` (manager)

**Caller:**
- `withdrawFinalHeirPayout` (vault): permissionless — anyone can call. Manager validates.
- `consumeHeirPayout` (manager): `onlyVault`.

**Preconditions (manager-side):**
- `distributionFinalized == true`.
- `finalPayoutAmountByNonce[nonce][actor] > 0`.

**Postconditions:**
- Returns `(amount, finalBps, completed)`.
- Marks `finalPayoutAmountByNonce[nonce][actor] = 0` (single-consume).
- `totalPaidOut += amount`, `withdrawnRevealerCount += 1`.
- If `withdrawnRevealerCount == revealersByNonce[nonce].length`: emits `InheritanceFullySettled`.
- Vault then calls `IVaultHub.ensureVault(actor)` to provision a vault for the heir if needed.
- Vault does `safeTransfer` of the payout amount to the heir's vault.
- `FinalHeirPayoutWithdrawn` event emitted (by vault).

**Threats:**

| ID | Threat | Severity | Mitigation |
|---|---|---|---|
| T-WD-1 | A-HEIR withdraws before finalize | Low | Reverts (`INH_DistributionNotFinalized`). |
| T-WD-2 | A-HEIR withdraws twice | Critical | `finalPayoutAmountByNonce[nonce][actor] = 0` after first consume. Second call returns `(0, _, _)` and the vault sends zero. |
| T-WD-3 | A-EXTERNAL calls vault.withdrawFinalHeirPayout pretending to be heir | Low | The manager's `consumeHeirPayout` uses `msg.sender` (== the vault, which uses `actor == original msg.sender` passed by the vault). The vault's facade uses `msg.sender` as `actor`. Identity binds correctly. |
| T-WD-4 | Heir vault hub `ensureVault` creates a vault with attacker keys | Critical | `ensureVault(heir)` creates a vault owned by `heir`. If heir has been compromised between reveal and withdraw, attacker gets the vault — but this is the same risk as any wallet compromise; not specific to inheritance. |
| T-WD-5 | Heir lost their key between reveal and withdraw | High | Funds go to the heir's address. If they cannot transact from it, the funds are stuck in the new vault. The new vault's own recovery flow is the remediation. |
| T-WD-6 | Reentrancy via heir vault `safeTransfer` callback | Critical | `nonReentrant` modifier on vault's `withdrawFinalHeirPayout`. State changes precede transfer. |
| T-WD-7 | Heir vault `ensureVault` is broken (e.g. VaultHub paused) | Medium | VaultHub's global pause is deprecated (HALT-01); `ensureVault` does not respect a deprecated pause. If a breaker on VaultHub blocks deployment, withdraw reverts; heir retries later. No fund loss. |

**Tests:** T-51 through T-57.

### 4.12 `cleanupMemorialVault()`

**Caller:** permissionless.
**Preconditions:**
- `inheritanceStateValue == STATE_MEMORIAL`.
- `block.timestamp >= inheritanceStateWindowEnd` (memorial period elapsed).

**Postconditions:**
- `inheritanceStateValue = STATE_CLOSED`.
- `MemorialVaultClosed` event emitted.

**Threats:**

| ID | Threat | Severity | Mitigation |
|---|---|---|---|
| T-CLN-1 | A-EXTERNAL cleans up prematurely | Low | Reverts (`INH_MemorialNotEnded`). |
| T-CLN-2 | Cleanup of an in-NORMAL vault | Low | Reverts (state check). |
| T-CLN-3 | Re-cleanup of a CLOSED vault | Low | Reverts (state check). |
| T-CLN-4 | Cleanup tries to selfdestruct the vault | n/a | Not used. Per design Decision 11, no `selfdestruct`. Only state-flag and event emission. |

**Tests:** T-58, T-59, T-60.

### 4.13 View functions

`heirCount`, `inheritanceConfigVersion`, `inheritanceState`, `hasVetoedClaim`, `hasRevealedClaim`, `isClaimedHash`, `getHeirClaimStatus`, `getRevealersOfActiveClaim`, plus all auto-getter publics.

**Threats:** None — view-only, no state changes. The auto-getters expose `revealedBasisPointsByNonce` and `finalBasisPointsByNonce` via the explicit `getHeirClaimStatus` accessor; per design Decision 8, these are intended to be public once revealed. No information disclosure violation.

---

## Part 5 — Cross-function attack paths

Multi-step attacks that span functions. Each path is named for ease of cross-referencing in audit comments.

### Path A: "Compromise + replace" (key compromise → heir replacement)

**Steps:**
1. Attacker compromises owner key for some window W.
2. Attacker calls `proposeInheritanceConfig` with `[attacker_addr]` as sole heir.
3. Attacker waits 30 days.
4. Attacker calls `confirmInheritanceConfig`.
5. Some time later, attacker (or accomplice acting as guardian) calls `initiateInheritanceClaim`.
6. Inheritance proceeds with attacker as sole heir.

**Required attacker capabilities:** Owner key access for 30+ days AND an accomplice guardian OR the ability to wait for natural death.
**Mitigations layered:**
- Step 2: heir-must-be-already-guardian — attacker must also have compromised the guardian-add path.
- Step 3 (30-day cooldown): event emitted. Off-chain monitoring of the vault would catch this. The design assumes such monitoring exists.
- Step 4: re-validates heir guardians are still guardians.
- Step 5: an honest guardian initiating against the modified config is unaware of the substitution; an attacker-controlled initiation faces the 30-day veto window with M-of-N guardian veto.

**Residual:** If the attacker silently compromises both the owner AND a quorum of guardians, this attack succeeds. The protocol's defense converges to "choose your guardian set well." This is acknowledged in the design and is the same residual as any social-recovery system.

### Path B: "Fast death" (legitimate guardian race, but timing matters)

**Steps:**
1. Owner dies.
2. Guardian A initiates inheritance.
3. Guardian A also happens to be heir #1.
4. Other heirs are slow to learn of the death and have not yet read their envelopes.
5. 90-day window closes with only guardian A having revealed.
6. Distribution finalizes; guardian A gets ALL of `payoutBalance` (redistributed).

**Required attacker capability:** Existing legitimate guardian status + being an heir + outliving the others' knowledge.
**Mitigations layered:**
- 90-day window is intentionally long to let all heirs hear, find their envelopes, and act.
- Owner override is still available during the first 30 days even if owner is dead (POL wallet OR family member with admin key access).
- The design accepts that an unresponsive heir forfeits per Decision 9.

**Residual:** Accepted. Better than funds being stuck if some heirs vanish. The 90-day window is the calibration knob.

### Path C: "Veto storm" (guardians block legitimate inheritance)

**Steps:**
1. Owner dies.
2. Guardian A initiates.
3. Guardians B, C, D, E (M-of-N quorum) veto without justification.
4. Claim returns to NORMAL.
5. Guardian A re-initiates.
6. Same vetoes; cycle continues forever.

**Required attacker capability:** Majority of guardians acting in bad faith.
**Mitigations layered:**
- This is the irreducible cost of M-of-N — same trust that lets guardians veto false claims lets them block real ones.
- DAO veto is asymmetric: DAO can veto (helping defenders) but cannot initiate. So DAO doesn't help here.
- Off-chain remediation: family may take legal action to compel guardians.

**Residual:** Accepted. Choose guardians from disjoint trust circles.

### Path D: "Race recovery" (initiator races a recovery rotation)

**Steps:**
1. Owner's key is compromised. Owner's guardians initiate a recovery rotation (legitimate).
2. Pre-rotation execution, attacker (who has the compromised key) tries to initiate inheritance.

**Mitigation:** `initiateInheritanceClaim` checks `pendingRecoveryRotation == false`. The recovery in flight blocks the inheritance start. (INV-2.)

**Residual:** None known. Tested in T-21.

### Path E: "Last-second config change"

**Steps:**
1. Owner makes proposal X.
2. 29 days, 23 hours, 59 minutes pass.
3. Attacker compromises key.
4. Attacker can confirm X right at hour zero.

**Mitigation:** The proposal was already chosen by the legitimate owner. Confirming it does not change the proposal content; it's still the heirs the legitimate owner picked.

**But:** Attacker could call `cancelInheritanceConfigChange` and then quickly propose a malicious version. That new proposal then has 30 days; attack reduces to Path A.

**Residual:** None new. The cancel-then-propose-new flow restarts the 30-day clock; the proposal-window protection is intact.

### Path F: "Heir claim front-run / replay"

**Steps:**
1. Heir submits `claimHeirShare(secret, bps)`.
2. Attacker watches mempool, copies (secret, bps), submits same tx with attacker as `msg.sender`.

**Mitigation:** Commitment binds `msg.sender == heirGuardianAddress`. Attacker's hash will not match the on-chain commitment. Revert.

**Mitigation 2:** Even if the attacker were also a configured heir (with their own commitment), they can only reveal their OWN share, not the front-run target's share. Two distinct heirs cannot share a commitment.

**Residual:** None.

---

## Part 6 — Repudiation and information disclosure

These two STRIDE categories are minor but explicit.

### Repudiation

Every state-changing action emits a named event with the actor's address indexed:
- `InheritanceConfigProposed`, `InheritanceConfigConfirmed`, `InheritanceConfigCancelled`, `ProofOfLifeWalletSet`
- `InheritanceClaimInitiated` (initiating guardian), `InheritanceClaimVetoed` (vetoing guardian), `InheritanceClaimOverridden` (owner)
- `HeirClaimRevealed` (heir)
- `FinalHeirPayoutWithdrawn` (heir + new vault)
- `InheritanceFullySettled`, `VaultEnteredMemorial`, `MemorialVaultClosed`

There is no way for any actor to make a state-changing call that does not produce an event tied to their address. Repudiation is impossible.

### Information disclosure

What's hidden on chain while owner alive:
- Heir share basis points (Decision 8) — only commitments are stored.
- Heir secrets (always) — never stored.

What's visible:
- Heir guardian addresses.
- Commitment hashes.
- `inheritanceConfigVersion`.
- `proofOfLifeWallet`.

The visible set is the minimum required for guardians to know who their fellow guardians are, and the contract to enforce snapshot-immutability of guardian sets. No more than necessary.

After claim:
- Revealed bps become public (in `getHeirClaimStatus`).
- Final bps after redistribution become public.
- Payout amounts become public.

This matches the design's Decision 8.

### What about heir identities under privacy concerns?

If an owner wants to obscure WHO their heirs are: not supported. The guardian addresses are visible by necessity (the contract must verify the actor was a configured guardian). Hiding identity would require a zk-proof scheme out of scope for v1.

---

## Part 7 — STRIDE cross-reference

For auditors who navigate by STRIDE category rather than function.

| STRIDE category | Threats |
|---|---|
| **S — Spoofing identity** | T-CLM-5 (front-run), T-CLM-6 (wrong wallet), T-OVR-1 (external pretends owner), T-INIT-5 (external pretends guardian), T-INIT-6 (heir pretends guardian) |
| **T — Tampering with data** | T-PROP-1 (compromised-key heir change), T-PROP-3 (duplicate heir), T-PROP-6 (length mismatch), T-CONF-2 (guardian removed between propose/confirm), T-CLM-2 (wrong bps), T-CLM-4 (stale version), T-VETO-1 (post-init guardian veto) |
| **R — Repudiation** | None — every state mutation emits an indexed event with actor. See Part 6. |
| **I — Information disclosure** | None significant — shares hidden until reveal per Decision 8. See Part 6. |
| **D — Denial of service** | T-INIT-2 (recovery race), T-INIT-3 (paused vault), T-VETO-4 (guardian collusion blocks), T-FIN-1 (premature finalize), T-CLM-7 (window expiry forfeit), T-CLN-1 (premature cleanup), Path C (veto storm) |
| **E — Elevation of privilege** | T-PROP-2 (non-guardian heir), T-CLM-3 (replay), T-WD-2 (double withdraw), T-WD-6 (reentrancy), T-OVR-2 (compromised-owner override), Path A (compromise + replace) |

---

## Part 8 — Test coverage mapping

Every threat above has a corresponding test case. Test IDs are stable across this document; the test suite at `test/inheritance.test.ts` (to be added in the next pass) will use these IDs.

| ID | Test | Type | Source |
|---|---|---|---|
| T-01 | Propose valid config, verify pending state | Positive | 4.1 |
| T-02 | Propose with non-guardian heir reverts | Negative | T-PROP-2 |
| T-03 | Propose with duplicate heirs reverts | Negative | T-PROP-3 |
| T-04 | Propose with 6 heirs reverts | Negative | T-PROP-4 |
| T-05 | Propose during active claim reverts | Negative | T-PROP-5 |
| T-06 | Propose with array length mismatch reverts | Negative | T-PROP-6 |
| T-07 | Propose with empty array reverts | Negative | T-PROP-7 |
| T-08 | Confirm after 30 days succeeds | Positive | 4.2 |
| T-09 | Confirm before cooldown reverts | Negative | T-CONF-1 |
| T-10 | Confirm after a heir guardian was removed reverts | Negative | T-CONF-2 |
| T-11 | Confirm during active claim reverts | Negative | T-CONF-4 |
| T-12 | clearAllHeirs after 30 days clears state | Positive | 4.4 |
| T-13 | clearAllHeirs respects cooldown | Negative | 4.4 |
| T-14 | setProofOfLifeWallet records address | Positive | 4.5 |
| T-15 | setProofOfLifeWallet(0) clears | Positive | 4.5 |
| T-16 | POL wallet has no transfer/admin privilege | Negative | T-POL-3 |
| T-17 | Guardian initiates → state == VETO_PERIOD | Positive | 4.6 |
| T-18 | Snapshot captures correct authority + guardian set | Positive | INV-7 |
| T-19 | Non-guardian initiates reverts | Negative | T-INIT-5 |
| T-20 | Heir-only (non-guardian) initiates reverts | Negative | T-INIT-6 |
| T-21 | Initiates during active recovery reverts | Negative | T-INIT-2 |
| T-22 | Initiates while paused reverts | Negative | T-INIT-3 |
| T-23 | Re-initiates after veto rolls state cleanly | Positive | T-INIT-4 |
| T-24 | DAO guardian initiates reverts | Negative | T-INIT-7 (gated on R-3) |
| T-25 | Single guardian veto increments count | Positive | 4.7 |
| T-26 | M-of-N veto cancels claim | Positive | 4.7 |
| T-27 | Post-init guardian cannot veto | Negative | T-VETO-1 |
| T-28 | Double-veto reverts | Negative | T-VETO-3 |
| T-29 | Veto after window expired reverts | Negative | T-VETO-5 |
| T-30 | Owner override during VETO succeeds | Positive | 4.8 |
| T-31 | POL wallet override during VETO succeeds | Positive | 4.8 |
| T-32 | External override reverts | Negative | T-OVR-1 |
| T-33 | Override after window expired reverts | Negative | T-OVR-4 |
| T-34 | Override during CLAIM_WINDOW reverts | Negative | T-OVR-5 |
| T-35 | Valid heir reveals share | Positive | 4.9 |
| T-36 | Reveal with wrong secret reverts | Negative | T-CLM-1 |
| T-37 | Reveal with wrong bps reverts (different commitment) | Negative | T-CLM-2 |
| T-38 | Reveal twice reverts | Negative | T-CLM-3 |
| T-39 | Reveal with stale-version commitment reverts | Negative | T-CLM-4 |
| T-40 | Mempool-replay attack: copy reveal from different msg.sender reverts | Negative | T-CLM-5 |
| T-41 | Reveal from non-configured wallet reverts | Negative | T-CLM-6 |
| T-42 | Reveal after window expired reverts | Negative | T-CLM-7 |
| T-43 | Reveal during VETO_PERIOD reverts | Negative | T-CLM-8 |
| T-44 | Finalize after window with partial reveals redistributes | Positive | 4.10 |
| T-45 | Finalize after all reveal succeeds before window end | Positive | 4.10 |
| T-46 | Finalize before window with partial reveals reverts | Negative | T-FIN-1 |
| T-47 | Double-finalize reverts | Negative | T-FIN-2 |
| T-48 | Sum of payouts equals payoutBalance exactly | Property | T-FIN-3, INV-9 |
| T-49 | Sum of final bps equals 10000 with at least one revealer | Property | INV-6 |
| T-50 | Zero-reveal finalize → MEMORIAL with intact balance | Positive | 4.10 |
| T-51 | Heir withdraws after finalize → vault transfers to heir vault | Positive | 4.11 |
| T-52 | Heir withdraws before finalize reverts | Negative | T-WD-1 |
| T-53 | Heir withdraws twice → second is zero | Property | T-WD-2 |
| T-54 | Heir withdraws auto-creates new vault if heir has none | Positive | 4.11 + ensureVault |
| T-55 | Heir withdraws goes to existing vault if heir has one | Positive | 4.11 + ensureVault |
| T-56 | Reentrancy via heir vault transfer reverts | Negative | T-WD-6 |
| T-57 | All heirs withdrawn → InheritanceFullySettled emits | Positive | 4.11 |
| T-58 | Cleanup before memorial end reverts | Negative | T-CLN-1 |
| T-59 | Cleanup after memorial end → CLOSED | Positive | 4.12 |
| T-60 | Cleanup of already-CLOSED reverts | Negative | T-CLN-3 |

### Property tests (Foundry / fuzz)

| ID | Property | Description |
|---|---|---|
| P-01 | Config-version monotonicity | `inheritanceConfigVersion` only ever increases. |
| P-02 | Single state | `inheritanceStateValue` is always in {0,1,2,3,4}. |
| P-03 | Recovery exclusion | `inheritanceStateValue != 0` implies `executeRecoveryRotation` reverts. |
| P-04 | Transfer exclusion | `inheritanceStateValue != 0` implies every fund-egress fn reverts. |
| P-05 | Bps sum bound | `totalRevealedBasisPoints <= TOTAL_BASIS_POINTS` always. |
| P-06 | Payout sum cap | `sum(finalPayoutAmountByNonce[nonce][heir]) <= payoutBalance`. |
| P-07 | Withdraw-once | Calling `consumeHeirPayout` twice returns zero on second call. |
| P-08 | Snapshot immutability | After init, `snapshotGuardian` and `snapshotVetoThreshold` do not change until claim resolves. |
| P-09 | Commitment binding | Re-encoding `(domain, chainid, vault, version, heir, bps, secret)` produces a hash that matches on-chain `heirCommitmentByGuardian[heir]` iff (bps, secret, heir, version) are unchanged. |

### Integration tests (Hardhat)

| ID | Integration | Description |
|---|---|---|
| I-01 | End-to-end happy path | Owner setup → 30d → confirm → death → guardian init → 30d → reveals → finalize → withdraws → memorial → cleanup. |
| I-02 | Owner override at hour 29 of veto period | Cancels claim cleanly, resets snapshot. |
| I-03 | Veto by M-of-N during veto period | Cancels claim cleanly. |
| I-04 | POL wallet override (separate keypair) | Works identically to owner override. |
| I-05 | One heir disappears | 90-day window closes, distribution redistributes to revealers. |
| I-06 | Active recovery blocks inheritance init | INV-2 round-trip. |
| I-07 | Active inheritance blocks recovery exec | INV-2 reverse. |
| I-08 | Heir without vault → ensureVault creates one | Vault provisioned, funds delivered. |
| I-09 | Heir with vault → funds go to existing vault | No second vault created. |
| I-10 | Inheritance during paused state reverts | INV-3 propagates correctly. |

---

## Part 9 — Residual risks (accepted)

These are documented gaps that are NOT bugs — they are acknowledged tradeoffs.

### R-1: Guardian-quorum cancel of pending config ✅ CLOSED in v1

Per design Decision 4, M-of-N guardians should be able to cancel a pending heir-config proposal as a backstop for owner-key compromise. **Implemented** as `cancelInheritanceConfigChangeByGuardians` on the inheritance manager, with a vault facade wrapper of the same name.

**Implementation:**

- New storage: `cancelVotesByPendingVersion[uint64]` and `hasVotedToCancelByPendingVersion[uint64][address]`. Keyed by `pendingConfigVersion` so vote counts are scoped to a specific proposal.
- Each guardian votes at most once per pending version. The function checks `_isGuardian(actor)` against the LIVE guardian set (not a snapshot — the proposal hasn't entered a claim, so snapshot semantics don't apply).
- When `cancelVotesByPendingVersion[version] >= _guardianThreshold()`, the pending state is cleared (heir slots, pending hash, effectiveAt all reset to zero / unset). `pendingConfigVersion` itself is not rolled back; the next propose() will recompute it from `inheritanceConfigVersion + 1`.
- Owner cancellation via `cancelInheritanceConfigChange` remains an independent path with no interaction.
- Events: `PendingConfigCancellationVoted` (per vote) and `PendingConfigCancelledByGuardians` (on quorum trip), plus the existing `InheritanceConfigCancelled`.
- Errors: `INH_AlreadyVotedToCancel`, `INH_NoPendingConfig`.

**Tests:** `test/hardhat/CardBoundVaultInheritance.r1r3.test.ts` — 6 cases covering single-vote-below-threshold, quorum-cancel-clears, double-vote-rejected, no-pending-rejected, non-guardian-rejected, and fresh-proposal-after-quorum-cancel.

**Residual after fix:** None new. The cancellation pathway gives compromised owners a recoverable window via their guardian set; choosing the guardian set well remains the underlying assumption (see R-7).

### R-2: POL wallet has no cooldown

Per Section 4.5. A compromised owner can clear or replace the POL instantly. There is no cooldown.

**Mitigation in place:** Event emission. Off-chain monitoring of POL changes is the user's defensive layer.

**Acceptance:** A cooldown would make the POL wallet useless for its primary purpose (instant cancel in emergencies). Accepted by design.

### R-3: DAO guardian initiation block ✅ CLOSED in v1

Per design Decision 12, the DAO is a guardian-of-last-resort that can VETO but not INITIATE. **Implemented** by tagging the DAO address as a separate field and gating `initiateInheritanceClaim` against it.

**Implementation:**

- New storage: `address public daoGuardian`. Defaults to zero (no DAO registered, in which case the check is a no-op).
- New owner-only setter: `setDAOGuardian(address)` (with vault facade wrapper `setDAOGuardian`). Settable to any address including zero; no cooldown — same semantics as `setProofOfLifeWallet` since this is a purely defensive constraint, not a fund-affecting one.
- New check in `initiateInheritanceClaim`: after the existing `_isGuardian(actor)` check passes, if `daoGuardian != address(0) && actor == daoGuardian`, revert with `INH_DAOCannotInitiate`.
- The DAO retains full veto authority — `vetoInheritanceClaim` does not gate on `daoGuardian`, just on the snapshot guardian set.
- Event: `DAOGuardianSet(previous, current)` on every change for off-chain monitoring.

**Tests:** Same file as R-1 — 4 cases covering setter positive (write/replace/clear), setter rejected from non-admin, DAO cannot initiate but can veto (T-24), and zero-default no-op verification.

**Residual after fix:** None. The check is enforced in code, no longer a governance promise.

### R-4: External obligation settlement ✅ CLOSED in v1 for all four obligation managers

Per Section 4.10, `finalizeInheritanceDistribution` does not by itself force-settle external obligations. The vault's outbound-transfer guard prevents leak, but it does not unwind existing positions. **Implemented** as pull-based `settleByInheritance` / `settleLoanByInheritance` on each obligation contract.

**Implemented in v1 (pull-based settlement):**

Rather than enumerate obligations from the inheritance side (gas-prohibitive — no per-buyer/per-borrower indexes exist), the obligation contracts themselves now expose `settleByInheritance` entry points. These are permissionless: anyone (heirs, surviving counterparties, watchful third parties) can call once one party's vault has entered MEMORIAL state.

- **EscrowManager.settleByInheritance(escrowId):** unwinds an escrow whose buyer or merchant vault is in MEMORIAL. Always refunds to the buyer (conservative — buyer hasn't yet received goods/services). State must be CREATED. Requires `setVaultHub` to be wired by the DAO.
- **VFIDETermLoan.settleLoanByInheritance(loanId):** branches by state:
  - OPEN / COSIGNING: lender's principal still in contract → refund to lender's settlement recipient. Guarantor commitments released. Loan transitions to CANCELLED.
  - ACTIVE / GRACE / RESTRUCTURED: principal already disbursed to borrower → mark DEFAULTED so the lender's normal default-claim flow pursues the heir vault. Guarantor commitments stay live — death does NOT forgive the debt.
  - REPAID / DEFAULTED / CANCELLED: revert (already terminal).
- **CommerceEscrow.settleByInheritance(escrowId):** unwinds a FUNDED or DISPUTED escrow when either party's vault enters MEMORIAL. Refunds to the buyer. Does NOT call `merchants._noteRefund` — inheritance is not a service-quality signal and shouldn't count against the merchant's dispute decay.
- **SubscriptionManager.settleByInheritance(subId):** marks subscription inactive when either party's vault enters MEMORIAL. Emits both `SubscriptionCancelled` (so existing off-chain consumers don't need new event handling) and `SubscriptionSettledByInheritance` for inheritance-specific observers.
- **VaultHub.isInMemorialState(vault):** view added to both the live contract and the canonical `IVaultHub` interface in SharedInterfaces.sol. Returns true only when the vault is in state 3 (MEMORIAL) or 4 (CLOSED) — ensures distribution has already happened before any obligation can be unwound.

**Threat surface for the new entry points (T-R4-1 through T-R4-7 from prior pass; all apply equally to the four managers):**

| ID | Threat | Severity | Mitigation |
|---|---|---|---|
| T-R4-1 | A-EXTERNAL calls settle on a healthy obligation | Critical | `isInMemorialState` returns false unless the vault is in state 3 or 4. Healthy vaults are in state 0. |
| T-R4-2 | A-EXTERNAL calls settle on a vault still in VETO_PERIOD or CLAIM_WINDOW | High | `isInMemorialState` returns false for states 1 and 2. Settlement is gated until distribution completes. |
| T-R4-3 | A-EXTERNAL calls settle on a vault that was just rolled back to NORMAL (after veto/override) | High | `isInMemorialState` returns false for state 0. Once state rolls back, settlement is no longer possible. |
| T-R4-4 | Reentrancy via the token transfer in settle path | Critical | `nonReentrant` modifier on each entry point. State transitions happen before transfers. |
| T-R4-5 | Double-settle (call settleByInheritance twice on same id) | Low | First call transitions state to REFUNDED/CANCELLED/DEFAULTED/inactive; second call reverts the state check. |
| T-R4-6 | Funds lost if VaultHub returns false negatives | Medium | The function reverts on the negative case; it does not transfer funds without a positive memorial check. False negatives are conservative (revert) rather than aggressive. |
| T-R4-7 | The deceased party isn't actually dead — VaultHub view manipulated | High | `IVaultHub` is set at contract construction (or via DAO-only `setVaultHub` on EscrowManager). The DAO is the integrity boundary. A malicious hub could lie, but the DAO would have to be compromised first. |

**Tests:** `test/hardhat/CardBoundVaultInheritance.r4.test.ts` (EscrowManager + VFIDETermLoan) and `test/hardhat/CardBoundVaultInheritance.r4final.test.ts` (SubscriptionManager + CommerceEscrow gating verification).

**Residual after this fix:**

- The settlement design **does not actively prevent timing arbitrage** where someone settles an obligation immediately after MEMORIAL begins, before heirs have withdrawn. This is intentional: MEMORIAL means distribution has completed, so timing within MEMORIAL is irrelevant to fund flow.
- SubscriptionManager remains in `contracts/future/`. Settling it requires the contract to be deployed in production; until then the entry point exists in code but is reachable only when SubscriptionManager itself is deployed.

### R-5: Owner ability to override is irreducible

T-OVR-2: a compromised owner key can override a legitimate inheritance claim indefinitely, prolonging the attacker's window. There is no way to deprive a non-compromised owner of override authority without breaking the premature-claim defense.

**Acceptance:** Accepted by design.

### R-6: M-of-N guardian collusion can block any claim

T-VETO-4, Path C. The same M-of-N threshold that protects against single-guardian fraud allows a colluding majority to block legitimate inheritance.

**Acceptance:** Inherent to the model. Mitigation is social: choose guardians from disjoint trust circles.

### R-7: Guardian set choice is the real security primitive

Almost every residual collapses to "the guardian set should not all be compromised." This is the design's irreducible trust assumption. The protocol cannot help a user who lets all their guardians be friends with their attacker.

---

## Part 10 — What's next

**Done:**
- R-1 (guardian-quorum cancel) — implemented + tested.
- R-3 (DAO initiation block) — implemented + tested.
- R-4 (external obligation settlement) — fully closed for EscrowManager, VFIDETermLoan, CommerceEscrow, SubscriptionManager. VaultHub gained `isInMemorialState` as the gating view; canonical `IVaultHub` interface in SharedInterfaces.sol updated.
- Local obligation settlement — `finalizeInheritanceDistribution` on the vault now clears local timelocked obligations (admin pending changes, withdrawal queue, payment queue) before delegating to the manager.
- Threat-model test coverage — 60 unit tests, 9 property tests, 10 integration tests, plus 10 R-1/R-3 tests, 10 R-4 EscrowManager+TermLoan tests, 8 R-4 SubscriptionManager+CommerceEscrow tests. 100+ inheritance-focused tests across 7 test files.

**Remaining:**
1. Slither pass + manual review + audit-ready package per design Step 6.
2. v1.1 expansions: integrate SubscriptionManager from `contracts/future/` into the live deployment graph so its settlement path is reachable on-chain.

— end of threat model
