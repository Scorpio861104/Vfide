# VFIDE Inheritance System — Design Specification

**Status:** Proposed design awaiting owner review before implementation.
**Goal:** Add an inheritance system to the active CardBoundVault implementation that matches VFIDE's promises (non-custodial, community-mediated, designed for financially excluded users) and meets the same security standard as the existing recovery system.
**Method:** Built on top of the existing CardBound + VaultHub + guardian architecture. Adds new functionality without modifying existing recovery paths.

This document is the source of truth for the design. Implementation follows after sign-off. Audit happens after implementation. Mainnet deployment happens after audit.

---

## Part 1 — Design philosophy

### What makes this hard

Inheritance in a non-custodial protocol has more failure modes than any other primitive. To get it right we have to navigate, all at once:

- **Premature claim** — heir tries to claim while owner is alive but absent (hospital, prison, retreat, lost phone)
- **Stale-heir** — owner declared heir years ago, situation has changed, heir is no longer the right person
- **Dead heir** — heir died before owner; without cleanup, funds are stuck
- **Lost-key heir** — heir's wallet is compromised or lost; heir who's still alive can't claim
- **Compromised-key heir-change** — attacker briefly steals owner keys and changes heir to themselves
- **Heir collusion** — heirs collude with someone to fake the owner's death
- **Guardian collusion** — guardians collude to redirect funds during inheritance
- **Race to claim** — multiple parties race to be the one to inherit
- **Estranged family** — the person on chain isn't the person who should inherit per the family's wishes
- **Pending obligations** — vault has open escrows, loans, subscriptions when inheritance triggers

We have to address every one of these. Below, every design decision is tagged with which failure modes it defends against.

### What the system is not trying to do

Three things this system explicitly does NOT try to do, so we can stay focused:

1. **Adjudicate legal disputes.** If a will conflicts with the on-chain designation, the chain executes per the on-chain state. Legal recovery, if needed, happens off chain through normal estate processes.

2. **Replace a will.** This system distributes the deceased's vault according to their on-chain designations. It does not handle other assets, debts, taxes, or obligations.

3. **Detect death automatically.** We do not poll death registries, oracle services, or dormancy timers. Death is detected by the people who knew the owner — the guardians — exactly as it would be off chain.

This is a deliberate scope choice. Every feature we don't try to add is a feature we don't have to defend.

### The core insight

The existing CardBoundVault recovery system is already a tested, audited mechanism for transferring control of a vault from one wallet to another, mediated by guardians, with M-of-N consensus and a challenge delay. **Inheritance is the same primitive with three differences:**

1. The "new wallet" is the heir's wallet, not a recovered wallet for the same person
2. The trigger is death (asserted by guardians), not key loss (asserted by owner)
3. If there are multiple heirs, the vault balance is split rather than fully transferred

We don't need a separate inheritance system. We need an *inheritance mode* on top of recovery, with specific safeguards added to address inheritance-specific failure modes that recovery doesn't have to handle.

This minimizes new attack surface, reuses audited code, and makes the system simpler to explain to users.

---

## Part 2 — Decisions made (and why)

This section lists every design decision with rationale. Each decision is something you can override before implementation.

### DECISION 1: Heirs must be existing guardians (address-visible), while shares remain private

**Choice:** Heir guardian addresses are stored explicitly on chain and must already be guardians at config-confirm time. Share amounts and heir secrets remain commitment-based and private until claim/finalization.

**Rationale:**
- The vault's recovery model trusts guardians with key rotation. Inheritance is functionally a final key rotation. Same level of trust required.
- An heir who is not a guardian is someone the owner trusts with vast wealth but did not trust with day-to-day account recovery. That gap is suspicious by construction — usually it means the owner has not had the necessary conversation with the heir.
- Forces the owner to have a real conversation with the heir while alive: "you'll be my guardian, here's how that works, and yes you'll also inherit." This conversation is the real product of inheritance planning. Code that incidentally forces this conversation is more valuable than code that lets people skip it.
- Reduces the "dead heir, funds stuck" failure mode — if heir's key is lost, owner notices because the heir-as-guardian stops responding to recovery requests on test rotations or scheduled check-ins.

**Defends against:** stale-heir, dead-heir, lost-key heir.

**Tradeoff:** Owner who wants a non-guardian heir (e.g., a minor child) has to either add them as guardian or use a trusted intermediary. We accept this constraint.

### DECISION 2: Heir share is a domain-separated commitment bound to vault and config version

**Choice:** The on-chain state stores guardian heir addresses and commitment hashes. A commitment must be:

`keccak256(abi.encode("VFIDE_INHERITANCE_V1", block.chainid, address(this), configVersion, heirGuardian, basisPoints, heirSecret))`

When inheritance is claimed, the heir reveals `(heirSecret, basisPoints)` from their guardian address and the contract verifies against the active `configVersion` commitment.

**Rationale:**
- Domain separation prevents replay across contracts/chains/config versions.
- Binding to `configVersion` invalidates old leaked commitments after config rotation.
- Split percentages are not publicly visible during life; they become public only during finalization.
- Owner can rotate heir secrets periodically as a defensive practice without rotating heir guardian addresses.

**Defends against:** compromised-key heir-change, commitment replay, heir collusion (heirs can't see if their share has changed).

**Tradeoff:** The heir must remember the secret OR derive it from something durable. The owner must communicate the secret to the heir somehow (sealed envelope, password manager entry willed to the family, verbal during a serious "if I die" conversation). UX cost is real and named.

### DECISION 3: Up to 5 heirs, percentages sum to exactly 10000 basis points

**Choice:** A vault can have 0 to 5 designated heirs. Shares are commitment-hidden while owner is alive. During inheritance finalization, the sum of all valid revealed basis points must equal exactly 10000 (= 100%) for full-reveal settlement; if not all heirs reveal, unrevealed shares are redistributed proportionally to revealed heirs by deterministic formula. Adding/removing an heir requires owner to produce a full replacement config.

**Rationale:**
- 5 is enough for the realistic family case (parents + multiple children) without exploding combinatorial complexity in tests or audit.
- Strict-sum prevents the "I forgot to assign 30%" silent failure where part of the vault becomes unrecoverable.
- Requiring redistribution on remove prevents the dead-heir scenario from leaving fractional shares stuck.

**Defends against:** unclaimed-share funds, percentage math errors.

**Tradeoff:** Because shares are hidden, strict-sum validation occurs at reveal/finalization rather than at config proposal. UI should validate locally before proposal and warn if local sum != 10000.

### DECISION 4: 30-day cooldown on heir changes, with grace transactions

**Choice:** Any change to the heir set (add, remove, percentage change, secret change) goes through a two-step process:
1. `proposeInheritanceConfig(newHeirGuardians, newHeirCommitments)` — locks in the proposed state
2. `confirmInheritanceConfig()` — owner must call this from the active wallet after 30 days, AND no inheritance claim can be active during those 30 days, AND the proposal can be cancelled at any time during the window

**Rationale:**
- Defends against the compromised-key attack: attacker who briefly steals owner's keys has at most a 30-day window to also drain the vault before the heir change becomes irrelevant. Owner has 30 days to notice the change (via `InheritanceConfigProposed` event sent to guardians and owner channels) and cancel.
- Prevents an active inheritance claim from being disrupted mid-flight by an attacker who steals keys and tries to reroute payout.
- Cancellation is by either owner OR M-of-N guardians, giving guardians a backstop if owner's wallet is compromised during the change window.

**Defends against:** compromised-key heir-change.

**Tradeoff:** Owner who wants to make a quick last-minute change cannot. We accept this; inheritance changes should not be made in a hurry.

### DECISION 5: Inheritance is triggered by a guardian, not by the heir, not by a timer

**Choice:** Only a guardian can call `initiateInheritanceClaim(reason)`. The guardian is asserting "I have reason to believe the owner is deceased." There is no dormancy timer. The owner being silent does not trigger inheritance — only a guardian's affirmative action does.

**Rationale:**
- Removes the entire class of "owner was just absent" failure modes. Owner can be off-chain for 5 years and nothing happens.
- The guardian initiating is taking a public, on-chain action with their identity attached. False initiation is reputationally damaging and reverse-able via veto.
- Matches how families actually handle death — someone close to the person notices and tells the rest of the family. The guardian playing this role is normal.

**Defends against:** premature claim, dormancy attacks, lost-key owner absence.

**Tradeoff:** If every guardian dies before the owner (unlikely but possible), inheritance cannot be triggered. The DAO can be configured as a fallback guardian-of-last-resort, see Decision 12.

### DECISION 6: 30-day veto window with owner override and authority snapshot

**Choice:** When a guardian initiates an inheritance claim, the contract enters a 30-day veto window during which:
- The owner can submit a single transaction from any wallet that the contract recognizes as theirs (current active wallet OR a pre-registered "proof of life" wallet) that cancels the claim entirely. This is the "still alive" override.
- Any other guardian can vote to veto the claim. If M-of-N guardians veto, the claim is cancelled.
- If neither happens during 30 days, the claim is automatically eligible for execution by any party (heir, guardian, anyone — execution is permissionless once the window closes and no veto/override has occurred).

At claim initiation, the contract snapshots: active owner admin, proof-of-life wallet, guardian set, and veto threshold. Override and veto checks during this claim use the snapshot, not mutable live state.

**Rationale:**
- 30 days is long enough for owner to wake from a coma, finish a sentence, return from a retreat, or have a family member reach them with a phone.
- Owner override from a separate pre-registered wallet handles the case where owner's primary wallet was the one lost. They register a secondary "proof of life" wallet during setup, which has no spending power but can interrupt inheritance.
- M-of-N veto by other guardians lets the guardian group as a whole stop a fraudulent claim by one guardian.

**Defends against:** premature claim, single-guardian fraud, heir collusion.

**Tradeoff:** 30 days means actual inheritance takes a month. Family in financial need cannot access funds during that month. We accept this; the alternative is faster but less safe inheritance, and inheritance is by definition not an emergency.

### DECISION 6A: Guardian set and veto threshold are immutable for a live claim

**Choice:** Once `initiateInheritanceClaim` is called, guardian membership and veto threshold used by the claim are fixed for that claim instance.

**Rationale:** Prevents governance/admin/attacker mutations during veto period from changing who can stop or approve a claim mid-flight.

**Defends against:** guardian-set mutation attacks, threshold manipulation during active claim.

**Tradeoff:** Legitimate guardian maintenance must wait until claim completes or is cancelled.

### DECISION 7: All vault obligations must be settled before payout

**Choice:** When inheritance moves from "approved" to "execute," the contract first checks for pending obligations:
- Open escrows → force-settled (returned to counterparty)
- Outstanding loans → repaid from vault balance if balance covers; otherwise inheritance pauses until balance covers or DAO governance approves a partial-repayment plan
- Active subscriptions → cancelled
- Pending withdrawal queue items → cancelled, returned to balance
- DAO voting power → relinquished (no voting power transfer)
- ProofScore reputation → does NOT transfer; new vaults for heirs start at zero score

The remaining net balance is what gets split per the heirs' percentages.

**Rationale:**
- Pending obligations cannot be cleanly split. Trying to split an escrow position three ways creates triple the work for the counterparty and no benefit.
- ProofScore is reputation — a property of the person, not the wallet. Heir starts their own reputation, doesn't get to inherit it. Prevents "buy a reputation by inheriting" attacks.
- Net positive balance is what's actually distributable.

**Defends against:** pending obligations, reputation gaming.

**Tradeoff:** If the deceased had a large outstanding loan, the family might inherit less than expected. We name this clearly: inheritance distributes net assets, not gross. This is also how off-chain inheritance works.

### DECISION 8: Split percentages are revealed at payout, not before

**Choice:** While the owner is alive, heir guardian addresses are visible but split percentages are NOT visible — percentages are part of each commitment. When the claim is approved and heirs reveal `(secret, percentage)` from their guardian addresses, the contract verifies each and percentages become public on-chain.

**Rationale:** Your earlier instinct. Heirs don't know what they're getting, can't game the system, can't pre-leverage their expected share, can't try to convince other heirs they got more than they did.

**Defends against:** heir collusion, premature heir-disputes.

**Tradeoff:** UI cannot show the split during life. Owner must remember (or note in a sealed letter) what split they assigned. The total commitment can include a hint or note for owner's own reference, encrypted.

### DECISION 9: Two-phase claim window for deterministic payouts

**Choice:** After the 30-day veto window closes with no veto and no owner override, inheritance enters a 90-day claim window with two phases:
1. **Reveal phase:** each heir submits `claimHeirShare(secret, basisPoints)` from their guardian address to prove entitlement.
2. **Finalize phase:** after window end (or earlier if all heirs reveal), anyone calls `finalizeInheritanceDistribution()`. The contract computes deterministic final basis points for revealers, redistributing non-revealed shares proportionally among revealers.

After finalization, each revealed heir withdraws from a fixed allocation (no race, no order dependence).

**Rationale:**
- An heir who can't be reached (lost keys, traveling, in mourning, doesn't know they're an heir yet) gets a generous window.
- Forfeit-to-revealers prevents funds from being permanently stuck if one heir vanishes.
- Two-phase flow removes payout-order dependence and rounding ambiguity.

**Defends against:** lost-key heir (some recovery via the 90-day window), dead heir (graceful redistribution), unclaimed funds.

**Tradeoff:** A grieving family member who doesn't act within 90 days loses their share. The 90-day window is long enough to be fair but short enough to settle the estate.

### DECISION 10: Claims create new vaults for heirs who don't already have one

**Choice:** When a heir claims, the contract checks if they have a vault via VaultHub. If they do, funds transfer there. If they don't, the contract uses `CardBoundVaultDeployer` to create a new vault for the heir as part of the claim transaction (gas paid by claimant). The new vault inherits no settings from the deceased's vault — it's a fresh vault with the heir's wallet as admin and the heir as their own first guardian.

**Rationale:**
- Forces the heir into the same protective infrastructure (guardians, recovery, withdrawal queue) instead of just dumping funds to an EOA.
- Family member who isn't a VFIDE user at time of inheritance is onboarded automatically.

**Defends against:** heir mishandling funds post-inheritance.

**Tradeoff:** Higher gas cost on the claim transaction. The heir's vault has no other guardians until they set them up. The protocol's existing 30-day guardian setup grace period applies, so they get reminders.

### DECISION 11: Deceased vault is archived, then closed after 1 year (no self-destruct)

**Choice:** After all heirs withdraw (or after finalization + claim window completion), the deceased's vault enters a "memorial" state — no further transactions possible, balance is zero, event history is preserved. After 1 year in memorial state, anyone can call `cleanupMemorialVault()` to mark the vault `CLOSED`, clear optional non-critical inheritance caches, and emit a final event. No `selfdestruct` is used.

**Rationale:**
- Provides a clear historical record for survivors who want to verify the inheritance settled correctly.
- Eventually cleans up storage costs and stops the vault from being a confusing artifact in the chain forever.

**Defends against:** chain bloat, memorial confusion.

**Tradeoff:** Some users may want the memorial to be permanent. We can add a "permanent memorial" option that the owner sets while alive (paid via a small fee to the protocol treasury).

### DECISION 12: DAO is a guardian-of-last-resort, but cannot trigger inheritance alone

**Choice:** Every vault has a DAO-controlled address as a default guardian by protocol policy. The DAO guardian can VETO an inheritance claim but cannot INITIATE one. The DAO's role is purely defensive — to stop fraud, never to start a claim.

**Rationale:**
- Provides a fallback against single-guardian-fraud even when other guardians are unresponsive.
- Prevents the DAO from claiming inheritance for vaults it doesn't actually have evidence is deceased.
- DAO veto requires a governance vote, which is expensive — used only for clear fraud.

**Defends against:** all-guardians-dead, all-guardians-collude.

**Tradeoff:** DAO has some power over inheritance flow. This is documented and the power is asymmetric (can stop, cannot initiate). Acceptable.

### DECISION 13: One inheritance configuration per vault

**Choice:** A vault has one inheritance configuration (set of heirs with shares). Setting it replaces the previous configuration. No multiple active configurations, no "primary and backup heirs," no "if X is dead then Y inherits."

**Rationale:**
- Branching configurations multiply attack surface exponentially. Each branch needs its own validation and threat model.
- Owner can express alternative scenarios off chain in a will or letter to the family. The on-chain state is simple.

**Tradeoff:** No on-chain "alternate heir if primary is dead." Owner must update on chain when situations change. We accept this.

---

## Part 3 — Threat model

Every threat from Part 1's list, with the design's response. If a threat is not addressed below, the design is incomplete and needs revision before implementation.

| Threat | Design response |
|--------|-----------------|
| Premature claim (owner alive, absent) | 30-day veto window + owner override from pre-registered "proof of life" wallet (Decision 6) |
| Stale heir (relationship changed) | Owner can change heir set with 30-day cooldown, but only if they actively manage it. We name this constraint in user-facing docs. (Decisions 1, 4) |
| Dead heir (heir died before owner) | Heir-must-be-guardian rule surfaces dead heirs quickly via failed guardian rotations (Decision 1); single dead-heir share redistributes among other claimants (Decision 9) |
| Lost-key heir | Heir-must-be-guardian means owner has had a conversation about key management (Decision 1); 90-day claim window allows some recovery (Decision 9); dead-heir-share-redistribution as fallback |
| Compromised-key heir-change | 30-day cooldown on heir changes + event emitted to guardians + owner can cancel during cooldown (Decision 4) |
| Heir collusion | Heirs don't know each other's shares until payout (Decision 8); claims are individual (Decision 9) |
| Guardian collusion | M-of-N veto by other guardians (Decision 6); DAO is non-initiating guardian-of-last-resort that can veto (Decision 12) |
| Race to claim | Two-phase reveal/finalize/withdraw flow uses fixed post-finalization allocations; payout order cannot change outcomes (Decision 9) |
| Estranged family | On-chain state is the law. Off-chain disputes resolved off chain. (Documented in user-facing materials.) |
| Pending obligations | All settled before payout (Decision 7) |
| Funds permanently stuck if no inheritance | If no heirs configured, vault behaves normally — death of owner with no inheritance configured means funds are lost unless the family can recover via the standard guardian recovery flow with the surviving guardians appointing a new "owner" by social proof. We document this clearly. |
| Inheritance triggered when vault is paused | Inheritance flow respects existing pause/freeze state. If vault is paused for security reasons (e.g., PanicGuard), inheritance pauses too. Cannot extract via inheritance what cannot be extracted normally. |
| Inheritance + recovery race | The two flows are mutually exclusive. Active inheritance claim blocks recovery rotation; active recovery rotation blocks inheritance initiation. |
| Guardian set mutation during live claim | Guardian membership and veto threshold are snapshotted at claim initiation and immutable for that claim (Decision 6A) |
| Reentrancy | All external calls (transfers, vault creation) happen after state updates. Standard `nonReentrant` modifier on all entry points. |
| Front-running of heir claims | Heir secrets are revealed in the claim transaction. Front-runner could observe the reveal in mempool and try to submit a competing claim. Mitigation: claim transaction binds reveal to the claimant's address (msg.sender), so front-running cannot redirect. |

---

## Part 4 — State machine

The inheritance system adds three new vault states on top of the existing CardBound state machine:

```
                     ┌─────────────────┐
                     │   NORMAL        │ ← existing state
                     │   (no claim     │
                     │    active)      │
                     └────────┬────────┘
                              │
              guardian calls initiateInheritanceClaim()
                              ↓
                     ┌─────────────────┐
                     │   VETO_PERIOD   │ ← new state
                     │   (30 days)     │
                     │                 │
                     │   Owner can     │
                     │   override      │
                     │   M-of-N can    │
                     │   veto          │
                     └────────┬────────┘
                              │
              30 days pass with no veto/override
                              ↓
                     ┌─────────────────┐
                     │   CLAIM_WINDOW  │ ← new state
                     │   (90 days)     │
                     │                 │
                     │   Each heir     │
                     │   claims own    │
                     │   share         │
                     │                 │
                     │   Obligations   │
                     │   settled on    │
                     │   first claim   │
                     └────────┬────────┘
                              │
              90 days pass OR all heirs claim
                              ↓
                     ┌─────────────────┐
                     │   MEMORIAL      │ ← new state
                     │   (1 year)      │
                     │                 │
                     │   Read-only,    │
                     │   record of     │
                     │   what happened │
                     └────────┬────────┘
                              │
              1 year passes + cleanup called
                              ↓
                     ┌─────────────────┐
                     │   CLOSED        │
                     └─────────────────┘
```

**Edge cases:**

- Owner override during VETO_PERIOD → returns to NORMAL, all pending claim state cleared
- M-of-N veto during VETO_PERIOD → returns to NORMAL, all pending claim state cleared
- All heirs claim during CLAIM_WINDOW → moves directly to MEMORIAL (don't wait for window to expire)
- Zero heirs claim during CLAIM_WINDOW → moves to MEMORIAL with balance intact, then to CLOSED after 1 year (funds become unclaimable; documented behavior for misconfigured inheritance)
- Active recovery rotation during NORMAL → blocks initiateInheritanceClaim until recovery completes
- New recovery rotation attempted during VETO_PERIOD or CLAIM_WINDOW → blocked, inheritance flow has priority

---

## Part 5 — Contract interface

This is the new interface to be added to CardBoundVault. Signatures only; full implementation comes in the implementation pass.

```solidity
// -------- Configuration (owner functions) --------

/// @notice Propose a new inheritance configuration. Starts 30-day cooldown.
/// @param heirGuardians Up to 5 guardian addresses, each must be a current guardian at confirmation.
/// @param heirCommitments Up to 5 commitments, each bound to (domain, chainid, vault, configVersion, heirGuardian, basisPoints, heirSecret).
function proposeInheritanceConfig(
    address[] calldata heirGuardians,
    bytes32[] calldata heirCommitments
) external onlyOwner;

/// @notice Confirm a previously proposed inheritance config after 30-day cooldown.
function confirmInheritanceConfig() external onlyOwner;

/// @notice Cancel a pending inheritance config change.
function cancelInheritanceConfigChange() external onlyOwner;

/// @notice Owner can clear all heirs (vault will not be inheritable on death).
function clearAllHeirs() external onlyOwner;  // Subject to same 30-day cooldown

/// @notice Pre-register a "proof of life" wallet that can override inheritance claims.
function setProofOfLifeWallet(address polWallet) external onlyOwner;

// -------- Initiation & veto (guardian functions) --------

/// @notice A guardian asserts the owner has died and inheritance should proceed.
/// @param reasonHash Hash of an off-chain reason document (death cert URI, family notice URL, etc.)
function initiateInheritanceClaim(bytes32 reasonHash) external;

/// @notice Another guardian vetos a pending claim.
function vetoInheritanceClaim() external;

// -------- Owner override --------

/// @notice Owner proves they're alive from either current admin wallet OR proof-of-life wallet.
/// Uses the authority snapshot captured when the claim was initiated.
function ownerOverrideClaim() external;

// -------- Claim & payout (heir functions) --------

/// @notice An heir reveals their commitment preimage during claim window.
/// @param heirSecret The secret they were given by the owner
/// @param basisPoints Their share in basis points
function claimHeirShare(bytes32 heirSecret, uint256 basisPoints) external nonReentrant;

/// @notice Finalizes distribution after reveal phase.
/// Computes deterministic redistribution of unrevealed shares to revealed heirs.
function finalizeInheritanceDistribution() external;

/// @notice Withdraw final payout allocated to msg.sender after finalization.
function withdrawFinalHeirPayout() external nonReentrant;

// -------- Settlement & cleanup --------

/// @notice Force-settle any pending obligations before claims can be paid out.
/// Called automatically by the first claim that triggers payout.
function settlePendingObligations() external;

/// @notice After 1 year in memorial state, clean up storage.
function cleanupMemorialVault() external;

// -------- View functions --------

/// @notice Number of heir slots currently configured (0-5).
function heirCount() external view returns (uint256);

/// @notice Active confirmed inheritance config version.
function inheritanceConfigVersion() external view returns (uint64);

/// @notice Current state of inheritance machinery.
/// @return state One of: NORMAL, VETO_PERIOD, CLAIM_WINDOW, MEMORIAL, CLOSED
/// @return windowEnd Timestamp when current window ends (0 if NORMAL or CLOSED)
function inheritanceState() external view returns (uint8 state, uint64 windowEnd);

/// @notice Returns true if a specific guardian has voted to veto a pending claim.
function hasVetoedClaim(address guardian) external view returns (bool);

/// @notice Returns the number of approvals (vetos) for a pending claim.
function vetoCount() external view returns (uint256);

/// @notice Returns true if claimant has revealed a valid claim in current claim window.
function hasRevealedClaim(address claimant) external view returns (bool);

/// @notice For a hash, returns true if it has been claimed (cannot be claimed twice).
function isClaimedHash(bytes32 heirHash) external view returns (bool);

// -------- Events --------

event InheritanceConfigProposed(uint64 indexed pendingVersion, address[] heirGuardians, bytes32[] heirCommitments, uint256 effectiveAt);
event InheritanceConfigConfirmed(uint64 indexed configVersion, address[] heirGuardians, bytes32[] heirCommitments);
event InheritanceConfigCancelled();
event ProofOfLifeWalletSet(address indexed polWallet);
event InheritanceClaimInitiated(address indexed initiatingGuardian, bytes32 reasonHash, uint64 vetoWindowEnd, uint64 configVersion);
event InheritanceClaimVetoed(address indexed guardian, uint256 currentVetos);
event InheritanceClaimOverridden(address indexed owner);
event InheritanceClaimEnteredClaimWindow(uint64 claimWindowEnd);
event HeirClaimRevealed(address indexed heir, uint256 basisPoints);
event InheritanceDistributionFinalized(uint256 revealedShares, uint256 forfeitedShares);
event FinalHeirPayoutWithdrawn(address indexed heir, address indexed newVault, uint256 finalBasisPoints, uint256 amount);
event InheritanceFullySettled(uint256 totalPaidOut);
event PendingObligationsSettled(uint256 escrowsResolved, uint256 loansRepaid, uint256 subsCancelled);
event VaultEnteredMemorial(uint64 memorialEnd);
event MemorialVaultClosed();

// -------- Errors --------

error INH_NotGuardian();
error INH_NotOwner();
error INH_NotProofOfLifeWallet();
error INH_WrongState(uint8 currentState, uint8 expectedState);
error INH_CooldownActive(uint64 remaining);
error INH_BasisPointsMustSumTo10000(uint256 actualSum);
error INH_TooManyHeirs(uint256 provided, uint256 max);
error INH_NoHeirsConfigured();
error INH_HashAlreadyClaimed();
error INH_InvalidSecret();
error INH_InsufficientGuardianApprovals(uint256 current, uint256 needed);
error INH_OwnerOverrideExpired();
error INH_RecoveryInProgress();
error INH_VaultPaused();
error INH_PendingObligations();
error INH_MemorialNotEnded(uint64 remaining);
error INH_GuardianSnapshotOnly();
error INH_DistributionNotFinalized();
error INH_AlreadyRevealed();
error INH_InvalidCommitment();
```

---

## Part 6 — Storage layout additions

New state to add to CardBoundVault. Use an explicit packed layout plan (do not estimate by "slot count") and preserve upgrade-safe ordering.

```solidity
// Configuration
mapping(uint256 => address) public heirGuardianByIndex;      // slot index 0-4 → guardian heir address
mapping(address => bytes32) public heirCommitmentByGuardian; // guardian -> commitment hash
uint8 public heirCount;                                      // number of configured heirs (0..5)
address public proofOfLifeWallet;                            // optional override wallet
uint64 public inheritanceConfigVersion;                      // increments on each confirmed config
bytes32 public pendingConfigHash;                            // hash of pending arrays + pendingVersion
uint64 public pendingHeirConfigEffectiveAt;                  // when the change can be confirmed
uint64 public pendingConfigVersion;                          // version that will become active on confirm

// State machine
uint8 public inheritanceStateValue;                // 0=NORMAL, 1=VETO_PERIOD, 2=CLAIM_WINDOW, 3=MEMORIAL, 4=CLOSED
uint64 public inheritanceStateWindowEnd;           // timestamp when current window ends
address public inheritanceInitiator;               // guardian who initiated the claim
bytes32 public inheritanceReasonHash;              // hash of the off-chain reason document
uint64 public claimConfigVersion;                  // config version snapshotted at claim initiation
mapping(address => bool) public guardianVetoed;    // which snapshotted guardians have vetoed
uint256 public vetoCount;                          // running count
mapping(address => bool) public hasRevealedClaim;  // claimant -> reveal submitted
mapping(address => uint256) public revealedBasisPoints; // claimant -> revealed basis points
uint256 public totalRevealedBasisPoints;           // running sum of revealed basis points
mapping(address => uint256) public finalBasisPoints; // final basis points after redistribution
bool public distributionFinalized;                 // true after finalizeInheritanceDistribution
uint256 public payoutBalance;                      // snapshot of vault balance at first claim

// Claim snapshot authority and guardian set (immutable for active claim)
address public snapshotOwnerAdmin;
address public snapshotProofOfLifeWallet;
uint256 public snapshotGuardianCount;
uint256 public snapshotVetoThreshold;
mapping(address => bool) public snapshotGuardian;
```

Constants:
```solidity
uint64 public constant INHERITANCE_VETO_PERIOD = 30 days;
uint64 public constant INHERITANCE_CLAIM_WINDOW = 90 days;
uint64 public constant INHERITANCE_MEMORIAL_PERIOD = 365 days;
uint64 public constant INHERITANCE_CONFIG_COOLDOWN = 30 days;
uint256 public constant MAX_HEIRS = 5;
uint256 public constant TOTAL_BASIS_POINTS = 10000;
bytes32 public constant INHERITANCE_COMMITMENT_DOMAIN = keccak256("VFIDE_INHERITANCE_V1");
uint8 public constant STATE_NORMAL = 0;
uint8 public constant STATE_VETO_PERIOD = 1;
uint8 public constant STATE_CLAIM_WINDOW = 2;
uint8 public constant STATE_MEMORIAL = 3;
uint8 public constant STATE_CLOSED = 4;
```

---

## Part 7 — Integration with existing systems

### Existing CardBoundVault: minimal changes

The inheritance machinery is additive. We do not modify any existing function. Specifically:

- `transferAdmin` / `acceptAdmin` — unchanged
- `executeRecoveryRotation` — unchanged, BUT it now also checks `inheritanceStateValue == STATE_NORMAL` and reverts otherwise
- All transfer functions — unchanged, but become unavailable once the vault enters CLAIM_WINDOW (balance is being distributed)

### VaultHub: small additions

VaultHub needs to know about inheritance to:
1. Prevent a vault from being a recovery target during an inheritance claim
2. Allow heirs without existing vaults to have one created at claim time
3. Optionally track "inherited from" relationships for memorial display

New functions:
```solidity
function createVaultForHeir(address heir, address inheritedFromVault) external returns (address);
function isInheritanceActive(address vault) external view returns (bool);
```

### CardBoundVaultDeployer: no changes

The deployer can be reused as-is to create heir vaults during claims.

### Frontend: new pages needed

- **Inheritance setup wizard** — owner configures heirs, generates secrets, exports envelope-printable PDFs for each heir
- **Inheritance status page** — owner sees configured heir guardians + commitments (shares hidden), state, history
- **"I am alive" override page** — pre-registered proof-of-life wallet can call override
- **Claim page** — heir reveals secret + share during claim window, then withdraws final payout after distribution finalization
- **Memorial page** — public view of completed inheritances (optional, owner can opt out at setup)

### Marketing: copy changes

After implementation, the about page and onboarding flow should describe the inheritance system honestly. The "Inheritance via Next of Kin" copy that currently exists for legacy vault should be updated to:

> "Designate up to 5 heirs from your guardian circle. Each heir's share is sealed until you pass. Guardians initiate the inheritance process when needed. A 30-day veto period protects against premature claims, and you can always cancel from your proof-of-life wallet. Your reputation does not transfer; each heir starts fresh."

---

## Part 8 — Implementation plan

This is what I would do, in this order, if you sign off on the design:

### Step 1 — Threat model document (1 day)
Write a formal threat-model doc per Microsoft STRIDE methodology, covering every attack scenario in Part 3 plus any others I find while writing. This is what the auditor will read first.

### Step 2 — Reference implementation in CardBoundVault (3-5 days)
Add the new functions, state, and events. Do not modify existing functions except for the recovery-blocking check. Compile cleanly under existing build.

### Step 3 — Unit tests (3-5 days)
One test per scenario in the threat model table. Plus property tests:
- Basis points always sum to 10000 in any valid configuration
- Total payout always equals vault balance at snapshot
- Cannot claim same hash twice
- Cannot inherit while recovery is active
- Cannot recover while inheritance is in CLAIM_WINDOW
- All state transitions match the diagram

### Step 4 — Integration tests (2-3 days)
Test against actual VaultHub, FraudRegistry, EscrowManager, PayrollManager. Verify obligation-settlement logic works end-to-end.

### Step 5 — Slither pass + manual review (1-2 days)
Run static analysis, fix any new findings, do a self-review against the threat model.

### Step 6 — Audit-ready package (1 day)
Threat model doc + spec doc (this document) + implementation + tests + slither output. Hand to auditor.

### Step 7 — Audit (2-4 weeks, external)
External audit firm review. I recommend Sherlock or Code4rena contest format for cost reasons, with a known firm (Trail of Bits, OpenZeppelin) for follow-up if budget allows.

### Step 8 — Audit response (1-2 weeks)
Fix findings, re-test, second audit pass on changes.

### Step 9 — Mainnet deployment
With the same handover and key-burn timeline as the rest of the protocol.

Total: ~6-10 weeks of work plus 2-4 weeks of audit. Realistically a 2-3 month project if you treat it as the safety-critical work it is.

---

## Part 9 — What this design does NOT include

Things I considered and explicitly chose not to include in v1:

- **Dormancy timer fallback.** Considered as a "if owner is silent for 5 years AND no guardian initiates" backstop. Rejected: adds an automatic trigger that defeats the "death is asserted by humans" property. If all guardians die, the DAO governance can vote to create a new claim path on a case-by-case basis.

- **Cryptographic proof of death.** Considered using a notary oracle or birth/death registry oracle. Rejected: depends on external infrastructure that doesn't exist in many of VFIDE's target markets.

- **Partial inheritance.** Owner gives heir 30% while still alive. Rejected: this is a transfer, not an inheritance. Owner can just send the heir 30% of the balance via normal transfer if they want.

- **Conditional inheritance.** "Only if I die from natural causes" or "Only if my child reaches 18." Rejected: requires legal-system integration this protocol doesn't have.

- **Heir-of-heir cascading.** "If primary heir dies first, secondary inherits." Rejected: branching state machine multiplies complexity. Owner can update configuration when situations change.

- **Time-locked heir release.** "Heir gets 25% immediately, then 25% per year for 4 years." Rejected: separate vesting system, not inheritance. Could be added as a separate primitive later.

- **Multi-sig heir.** Heir is itself a multisig wallet. Rejected as a feature: not blocked. Just don't validate the heir address is an EOA. If user wants their heir to be Gnosis Safe, that works as-is.

- **Memorial fund / charity fallback.** Unclaimed shares go to a designated charity instead of redistributing to other heirs. Rejected for v1, could be added later.

Every excluded feature is a defensible choice. Each could be added in v2 if real user demand emerges. None are critical for launch.

---

## Part 10 — Final summary

What this design promises:

**Safe.** Every named failure mode has a documented defense. The defense layer cake is: hash-committed heirs + guardian-must-be-heir + 30-day veto + 30-day config cooldown + owner override + obligation-settlement + reputation-non-transfer + 90-day claim window + redistribute-unclaimed + DAO veto-of-last-resort.

**Best.** I am not aware of another DeFi inheritance design that combines all these properties. Most are either (a) static heir + dormancy (Argent, some social recovery wallets), (b) guardian-only recovery without explicit inheritance designation (Safe), or (c) institutional probate via oracles (a few smaller projects). This design takes the best of guardian recovery and adds inheritance-specific protections without sacrificing the non-custodial property.

**Best for VFIDE's audience.** It assumes users have a community (guardians) and uses that as the trust foundation. It doesn't assume legal infrastructure (no notaries, no oracles, no courts). It works for a market seller's family in Lagos as well as it works for a hodler in San Francisco. The hash-committed split percentages are private during life, which respects family dynamics. The forced "heir must also be a guardian" rule structures hard conversations about death that families need to have anyway.

**Best for the protocol.** Reuses existing audited recovery code. Adds ~600-800 lines of new contract code (compared to porting the whole UserVaultLegacy inheritance which is ~150 lines but doesn't fit CardBound's architecture). Audit cost is proportional to that ~700 lines and the threat model coverage I've laid out, not to the entire vault.

If you sign off on this design, I'll start with Step 1 (threat model doc) and build down through the steps. Implementation will land in CardBoundVault as a clean diff that doesn't touch existing recovery code, with one of the changes being the recovery-blocking check.

You can override any decision in Part 2 before I start. The most likely candidates for override based on prior conversation:
- Decision 1 (heir must be guardian) — push back if you want non-guardian heirs allowed
- Decision 5 (no dormancy timer) — push back if you want a backstop dormancy trigger
- Decision 7 (reputation does not transfer) — push back if you want reputation to inherit
- Decision 11 (memorial then closure) — push back if you want permanent on-chain memorials

Everything else I think holds up on its own. Tell me what to change, and I'll write the threat model.

— end of design specification
