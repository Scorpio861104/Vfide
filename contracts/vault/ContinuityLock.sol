// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.30;

/**
 * @title ContinuityLock
 * @notice Process-completion lock for the VFIDE inheritance hand-off (Backend Completion Campaign 12, Wave E).
 *
 * PROBLEM. The inheritance manager (CardBoundVaultInheritanceManager) lets the owner / proof-of-life wallet cancel a
 * claim via ownerOverrideClaim() right up until finalization (assets irreversibly leave). That maximizes a LIVING
 * owner's control, but it creates a post-veto attack surface: if the owner's key is COMPROMISED (the owner has died
 * and an attacker holds the key, or a hostile party controls it), that key could repeatedly cancel a legitimate
 * claim during the 90-day CLAIM window to STALL the heirs forever, or propose a new config to HIJACK (redirect) the
 * inheritance to itself.
 *
 * SOLUTION — lock PROCESS, never FUNDS. Once a claim's VETO window (30d — the owner's generous defense window) has
 * elapsed and the claim is still active (CLAIM_WINDOW, not finalized), this lock ENGAGES deterministically:
 *   • Config changes (propose / confirm / clear heirs) are FROZEN — a compromised key cannot redirect the heirs.
 *   • The LONE-KEY ownerOverrideClaim is BLOCKED — a compromised key cannot stall the heirs by cancelling.
 *   • A GUARDIAN-CORROBORATED owner cancel REMAINS available — a genuinely-returning owner, vouched for by a quorum
 *     of their own guardians (who know them personally), can still reclaim. A lone key cannot reach this quorum.
 *   • The heirs' pre-committed claims and finalizeInheritanceDistribution PROCEED to deterministic completion.
 *
 * NON-CUSTODIAL INVARIANTS (by construction):
 *   • This contract NEVER holds, moves, or seizes funds. Heirs claim with their own secrets; finalize distributes
 *     to the pre-committed heirs. The lock only gates PROCESS transitions (config / cancel), not asset custody.
 *   • The lock NEVER engages during the VETO window — the owner's full 30-day single-key defense is preserved.
 *   • The lock is DETERMINISTIC (time + claim-state) — no party engages or releases it at discretion; it follows
 *     from the rules and is publicly observable.
 *
 * Integration: the inheritance manager calls the `require*` guards before mutating config or honoring a lone-key
 * override; it consults `isLocked(...)` for the engaged state; and it routes a post-veto owner reclaim through the
 * guardian-corroboration quorum here.
 */
contract ContinuityLock {
    // ── Inheritance states (mirrors CardBoundVaultInheritanceManager) ────────
    uint8 public constant STATE_NORMAL = 0;
    uint8 public constant STATE_VETO_PERIOD = 1;
    uint8 public constant STATE_CLAIM_WINDOW = 2;
    uint8 public constant STATE_MEMORIAL = 3;

    // ── Errors ────────────────────────────────────────────────────────────────
    error CL_Locked();                 // action forbidden while the continuity lock is engaged
    error CL_NotLocked();              // guardian-corroborated cancel only applies while locked
    error CL_NotGuardian();
    error CL_AlreadyVoted();
    error CL_QuorumNotReached(uint256 have, uint256 need);
    error CL_OnlyManager();

    // ── Wiring ──────────────────────────────────────────────────────────────
    address public immutable manager; // the inheritance manager that consults this lock
    modifier onlyManager() { if (msg.sender != manager) revert CL_OnlyManager(); _; }

    // ── Guardian-corroboration quorum for a post-veto owner reclaim ──────────
    // Keyed by the manager's claim nonce so votes never bleed across claims.
    mapping(uint256 => mapping(address => bool)) public reclaimVoted;
    mapping(uint256 => uint256) public reclaimVotes;

    event ContinuityLockEngaged(uint256 indexed claimNonce, uint64 vetoEndedAt);
    event GuardianReclaimVoted(uint256 indexed claimNonce, address indexed guardian, uint256 votes);
    event GuardianCorroboratedReclaim(uint256 indexed claimNonce, uint256 votes, uint256 threshold);

    constructor(address manager_) {
        require(manager_ != address(0), "CL: zero manager");
        manager = manager_;
    }

    // ── Core: is the lock engaged? (pure, deterministic) ─────────────────────
    /**
     * @param state                 current inheritance state
     * @param distributionFinalized whether assets have irreversibly left (finalized)
     * @param ownerReclaimed        whether a guardian-corroborated owner reclaim has completed for this claim
     * The lock is engaged exactly during an active, non-finalized CLAIM_WINDOW that has not been owner-reclaimed.
     * It is NEVER engaged during NORMAL or the VETO_PERIOD (owner's single-key defense preserved).
     */
    function isLocked(uint8 state, bool distributionFinalized, bool ownerReclaimed) public pure returns (bool) {
        if (state != STATE_CLAIM_WINDOW) return false; // includes NORMAL, VETO_PERIOD, MEMORIAL
        if (distributionFinalized) return false;       // process already completed
        if (ownerReclaimed) return false;              // legitimate owner escape completed
        return true;
    }

    // ── Guards the manager calls before process-mutating actions ─────────────
    /// Config changes (propose / confirm / clear heirs) are forbidden while locked (anti-hijack).
    function requireConfigChangeAllowed(uint8 state, bool finalized, bool ownerReclaimed) external pure {
        if (isLocked(state, finalized, ownerReclaimed)) revert CL_Locked();
    }
    /// A LONE-KEY owner override is forbidden while locked (anti-stall). During the veto window it is always allowed.
    function requireLoneOwnerOverrideAllowed(uint8 state, bool finalized, bool ownerReclaimed) external pure {
        if (isLocked(state, finalized, ownerReclaimed)) revert CL_Locked();
    }

    // ── Guardian-corroborated owner reclaim (the living-owner escape) ────────
    /**
     * A guardian casts a vote to corroborate the owner's post-veto reclaim. Only meaningful while locked; votes are
     * scoped to the claim nonce. The manager verifies `isGuardian` and passes it through (onlyManager) so the lock
     * trusts the manager's guardian set rather than re-deriving it.
     */
    function castGuardianReclaimVote(
        uint256 claimNonce,
        address guardian,
        bool callerIsGuardian,
        uint8 state,
        bool finalized,
        bool ownerReclaimed
    ) external onlyManager returns (uint256 votes) {
        if (!isLocked(state, finalized, ownerReclaimed)) revert CL_NotLocked();
        if (!callerIsGuardian) revert CL_NotGuardian();
        if (reclaimVoted[claimNonce][guardian]) revert CL_AlreadyVoted();
        reclaimVoted[claimNonce][guardian] = true;
        votes = ++reclaimVotes[claimNonce];
        emit GuardianReclaimVoted(claimNonce, guardian, votes);
    }

    /**
     * The owner (or proof-of-life wallet) completes a post-veto reclaim ONLY if a guardian quorum has corroborated.
     * Returns true to the manager, which then cancels the active claim and returns the vault to NORMAL. A lone key
     * (no guardian votes) can never satisfy `votes >= threshold`, so it cannot stall the heirs.
     */
    function checkGuardianCorroboratedReclaim(
        uint256 claimNonce,
        uint8 guardianThreshold,
        uint8 state,
        bool finalized,
        bool ownerReclaimed
    ) external onlyManager returns (bool) {
        if (!isLocked(state, finalized, ownerReclaimed)) revert CL_NotLocked();
        uint256 votes = reclaimVotes[claimNonce];
        if (votes < guardianThreshold) revert CL_QuorumNotReached(votes, guardianThreshold);
        emit GuardianCorroboratedReclaim(claimNonce, votes, guardianThreshold);
        return true;
    }

    // ── Heir progress is always allowed while locked (deterministic completion) ──
    /// Heir claims and finalization are never blocked by the lock — the lock EXISTS to let them complete.
    function heirProgressAllowedWhileLocked() external pure returns (bool) { return true; }
}
