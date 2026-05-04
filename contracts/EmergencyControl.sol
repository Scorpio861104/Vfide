// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * EmergencyControl.sol
 *
 * Purpose:
 *  - Provide two controlled paths to toggle the existing EmergencyBreaker:
 *      1) DAO direct toggle
 *      2) Emergency Committee (M-of-N) toggle
 *  - Enforce anti-flap cooldown between successive toggles
 *  - Log every action to ProofLedger (best-effort)
 *
 * Notes:
 *  - This module CALLS an already-deployed EmergencyBreaker (the one you have in VFIDESecurity.sol).
 *  - No vault-level locks here (that’s GuardianLock/PanicGuard). This is ONLY the global breaker toggle.
 */

import "./SharedInterfaces.sol";

error EC_NotDAO();
error EC_Zero();
error EC_BadThreshold();
error EC_AlreadyMember();
error EC_NotMember();
error EC_AlreadyVoted();
error EC_Cooldown();
error EC_PendingFoundationChange();
error EC_NoPendingFoundationChange();
error EC_FoundationChangeLocked();
error EC_CommitteeCapExceeded();

contract EmergencyControl is ReentrancyGuard {
    event ModulesSet(address dao, address breaker, address ledger);
    event CooldownSet(uint64 secondsMin);
    event CommitteeReset(uint8 threshold, address[] members);
    event MemberAdded(address member);
    event MemberRemoved(address member);
    event FoundationRotated(address indexed oldFoundation, address indexed newFoundation);
    event FoundationRotationProposed(address indexed newFoundation, uint64 effectiveAt);
    event CommitteeVote(address indexed member, bool halt, uint8 approvals, string reason);
    event CommitteeTriggered(bool halt, string reason);
    event DAOToggled(bool halt, string reason);
    event ModulesChangeQueued(address dao, address breaker, address ledger, uint64 executeAfter);
    event ModulesChangeCancelled(address dao, address breaker, address ledger);
    event FoundationMemberChangeQueued(address indexed member, bool isAdd, uint64 effectiveAt);
    event FoundationMemberChangeCancelled(address indexed member);

    address public dao;
    /// @notice Foundation address that can manage committee members
    ///         independent of the DAO, preventing a compromised DAO from locking out emergency control.
    address public foundation;
    IEmergencyBreaker public breaker;
    IProofLedger public ledger; // optional

    // anti-flap minimum time between successful toggles
    uint64 public minCooldown = 5 minutes;
    uint64 public lastToggleTs;

    // Committee config
    mapping(address => bool) public isMember;
    address[] public currentMembers;
    uint8 public memberCount;
    uint8 public threshold; // M-of-N
    uint8 public constant MAX_COMMITTEE_MEMBERS = 21;

    // Per-stance voting (separate counters for halt=true vs halt=false)
    uint256 public epoch;
    mapping(address => uint256) public lastVotedHaltEpoch;
    mapping(address => uint256) public lastVotedUnhaltEpoch;
    uint8 public approvalsHalt;
    uint8 public approvalsUnhalt;
    
    uint64 public voteExpiryPeriod = 7 days;
    uint64 public haltVotingStartTime;
    uint64 public unhaltVotingStartTime;

    uint64 public constant MODULE_CHANGE_DELAY = 48 hours;
        // TL-365 FIX: 24h timelock for threshold changes (#365)
        uint64 public constant THRESHOLD_CHANGE_DELAY = 24 hours;
        uint8 public pendingThreshold;
        uint64 public pendingThresholdAt;
    struct PendingModules {
        address dao;
        address breaker;
        address ledger;
    }
    PendingModules public pendingModules;
    uint64 public pendingModulesAt;

    /// @notice 48h timelock state for foundation rotation (M-5).
    address public pendingFoundation;
    uint64  public pendingFoundationAt;

    /// @notice 24-hour queue for foundation-initiated committee member changes.
    /// @dev M-5 FIX: DAO-initiated changes now also use a short 1-hour queue so monitoring
    ///      can detect any unexpected membership change even if DAO admin is compromised.
    ///      When the foundation adds or removes a member, the change is queued here so the
    ///      DAO has a window to observe and react before it takes effect.
    uint64 public constant FOUNDATION_MEMBER_CHANGE_DELAY = 24 hours;
    uint64 public constant DAO_MEMBER_CHANGE_DELAY = 1 hours;
    struct PendingFoundationMemberChange {
        address member;
        bool isAdd;
        uint64 effectiveAt;
    }
    PendingFoundationMemberChange public pendingFoundationMemberChange;

    modifier onlyDAO() {
        _checkDAO();
        _;
    }

    function _checkDAO() internal view {
        if (msg.sender != dao) revert EC_NotDAO();
    }

    constructor(address _dao, address _breaker, address _ledger, address _foundation) {
        if (_dao == address(0) || _breaker == address(0)) revert EC_Zero();
        require(_foundation != address(0), "EC: foundation=0");
        dao = _dao;
        foundation = _foundation;
        breaker = IEmergencyBreaker(_breaker);
        ledger = IProofLedger(_ledger);
        epoch = 1;
        emit ModulesSet(_dao, _breaker, _ledger);
    }

    // ───────────────────────────────── Admin / config

    function setModules(address _dao, address _breaker, address _ledger) external onlyDAO nonReentrant {
        if (_dao == address(0) || _breaker == address(0)) revert EC_Zero();
        require(pendingModulesAt == 0, "EC: pending modules");
        pendingModules = PendingModules({ dao: _dao, breaker: _breaker, ledger: _ledger });
        pendingModulesAt = uint64(block.timestamp) + MODULE_CHANGE_DELAY;
        emit ModulesChangeQueued(_dao, _breaker, _ledger, pendingModulesAt);
        _log("ec_modules_queued");
    }

    function applyModules() external onlyDAO nonReentrant {
        require(pendingModulesAt != 0, "EC: no pending modules");
        require(block.timestamp >= pendingModulesAt, "EC: modules timelock");
        dao = pendingModules.dao;
        breaker = IEmergencyBreaker(pendingModules.breaker);
        ledger = IProofLedger(pendingModules.ledger);
        emit ModulesSet(pendingModules.dao, pendingModules.breaker, pendingModules.ledger);
        delete pendingModules;
        delete pendingModulesAt;
        _log("ec_modules_set");
    }

    function cancelModules() external onlyDAO nonReentrant {
        require(pendingModulesAt != 0, "EC: no pending modules");
        emit ModulesChangeCancelled(pendingModules.dao, pendingModules.breaker, pendingModules.ledger);
        delete pendingModules;
        delete pendingModulesAt;
        _log("ec_modules_cancelled");
    }

    function setCooldown(uint64 secondsMin) external onlyDAO nonReentrant {
        // L-2 FIX (internal audit finding — anti-flap bypass): Zero cooldown would disable anti-flap protection entirely.
        // 5 minutes is the minimum because: (a) the breaker is a last-resort emergency
        // mechanism, not a ping-pong switch; (b) rapid repeated toggles could be used to
        // DoS the protocol or mask other attacks; (c) 5 min still allows a responsive
        // unhalt within a single Ethereum epoch after a false-positive halt.
        require(secondsMin >= 5 minutes, "EC: cooldown too short");
        minCooldown = secondsMin;
        emit CooldownSet(secondsMin);
        _log("ec_cooldown_set");
    }

    function resetCommittee(uint8 _threshold, address[] calldata members) external onlyDAO nonReentrant {
        if (members.length > MAX_COMMITTEE_MEMBERS) revert EC_CommitteeCapExceeded();
        if (_threshold == 0 || _threshold > members.length) revert EC_BadThreshold();
        
        // Clear old members
        for (uint256 i = 0; i < currentMembers.length; i++) {
            isMember[currentMembers[i]] = false;
        }
        delete currentMembers;

        // Reinitialize:
        memberCount = 0;
        threshold = _threshold;

        _resetVotes();

        for (uint256 j = 0; j < members.length; j++) {
            address m = members[j];
            if (m == address(0)) revert EC_Zero();
            if (isMember[m]) revert EC_AlreadyMember();
            isMember[m] = true;
            currentMembers.push(m);
            memberCount += 1;
            emit MemberAdded(m);
        }
        emit CommitteeReset(_threshold, members);
        _log("ec_committee_reset");
    }

    function resetVotes() external onlyDAO nonReentrant {
        _resetVotes();
        haltVotingStartTime = 0;
        unhaltVotingStartTime = 0;
        _log("ec_votes_reset");
    }

    function addMember(address m) external nonReentrant {
        require(msg.sender == dao || msg.sender == foundation, "EC: not DAO or foundation");
        if (m == address(0)) revert EC_Zero();
        if (isMember[m]) revert EC_AlreadyMember();

        if (msg.sender == dao) {
            // M-5 FIX: DAO path now queued for 1 hour (short observability window).
            if (pendingFoundationMemberChange.effectiveAt != 0) revert EC_PendingFoundationChange();
            uint64 effectiveAt = uint64(block.timestamp) + DAO_MEMBER_CHANGE_DELAY;
            pendingFoundationMemberChange = PendingFoundationMemberChange(m, true, effectiveAt);
            emit FoundationMemberChangeQueued(m, true, effectiveAt);
            _log("ec_dao_add_queued");
        } else {
            // Foundation: 24-hour queue — gives DAO time to observe and react
            if (pendingFoundationMemberChange.effectiveAt != 0) revert EC_PendingFoundationChange();
            uint64 effectiveAt = uint64(block.timestamp) + FOUNDATION_MEMBER_CHANGE_DELAY;
            pendingFoundationMemberChange = PendingFoundationMemberChange(m, true, effectiveAt);
            emit FoundationMemberChangeQueued(m, true, effectiveAt);
            _log("ec_foundation_add_queued");
        }
        // threshold unchanged; DAO should adjust separately if desired
    }

    function removeMember(address m) external nonReentrant {
        require(msg.sender == dao || msg.sender == foundation, "EC: not DAO or foundation");

        if (msg.sender == dao) {
            // M-5 FIX: DAO remove also queued for 1-hour observability.
            if (!isMember[m]) revert EC_NotMember();
            if (pendingFoundationMemberChange.effectiveAt != 0) revert EC_PendingFoundationChange();
            uint64 effectiveAt = uint64(block.timestamp) + DAO_MEMBER_CHANGE_DELAY;
            pendingFoundationMemberChange = PendingFoundationMemberChange(m, false, effectiveAt);
            emit FoundationMemberChangeQueued(m, false, effectiveAt);
            _log("ec_dao_remove_queued");
        } else {
            // Foundation: 24-hour queue
            if (!isMember[m]) revert EC_NotMember();
            if (pendingFoundationMemberChange.effectiveAt != 0) revert EC_PendingFoundationChange();
            uint64 effectiveAt = uint64(block.timestamp) + FOUNDATION_MEMBER_CHANGE_DELAY;
            pendingFoundationMemberChange = PendingFoundationMemberChange(m, false, effectiveAt);
            emit FoundationMemberChangeQueued(m, false, effectiveAt);
            _log("ec_foundation_remove_queued");
        }
    }

    /// @notice Apply a pending foundation-initiated member change after the 24-hour timelock.
    function applyFoundationMemberChange() external nonReentrant {
        require(msg.sender == dao || msg.sender == foundation, "EC: not DAO or foundation");
        PendingFoundationMemberChange memory p = pendingFoundationMemberChange;
        if (p.effectiveAt == 0) revert EC_NoPendingFoundationChange();
        if (block.timestamp < p.effectiveAt) revert EC_FoundationChangeLocked();
        delete pendingFoundationMemberChange;

        if (p.isAdd) {
            if (!isMember[p.member]) {
                _applyAddMember(p.member);
            }
        } else {
            if (isMember[p.member]) {
                _applyRemoveMember(p.member);
            }
        }
        _log("ec_foundation_change_applied");
    }

    /// @notice Cancel a pending foundation-initiated member change.
    function cancelFoundationMemberChange() external nonReentrant {
        require(msg.sender == dao || msg.sender == foundation, "EC: not DAO or foundation");
        if (pendingFoundationMemberChange.effectiveAt == 0) revert EC_NoPendingFoundationChange();
        address m = pendingFoundationMemberChange.member;
        delete pendingFoundationMemberChange;
        emit FoundationMemberChangeCancelled(m);
        _log("ec_foundation_change_cancelled");
    }

    // ─── Internal member mutation helpers ───────────────────────────────────

    function _applyAddMember(address m) internal {
        if (memberCount >= MAX_COMMITTEE_MEMBERS) revert EC_CommitteeCapExceeded();
        isMember[m] = true;
        memberCount += 1;
        currentMembers.push(m);
        emit MemberAdded(m);
        _log("ec_member_add");
    }

    function _applyRemoveMember(address m) internal {
        isMember[m] = false;
        memberCount -= 1;

        for (uint256 i = 0; i < currentMembers.length; i++) {
            if (currentMembers[i] == m) {
                currentMembers[i] = currentMembers[currentMembers.length - 1];
                currentMembers.pop();
                break;
            }
        }

        emit MemberRemoved(m);

        // H-1 FIX: Reset votes when membership changes to prevent threshold manipulation
        _resetVotes();
        // M-3 FIX: Reset vote timers
        haltVotingStartTime = 0;
        unhaltVotingStartTime = 0;

        if (threshold > memberCount) {
            threshold = memberCount; // clamp for safety
        }
        _log("ec_member_remove");
    }

    /// @notice TL-365 FIX: Propose a threshold change (24h timelock). (#365)
    function setThreshold(uint8 _threshold) external onlyDAO nonReentrant {
        if (_threshold == 0 || _threshold > memberCount) revert EC_BadThreshold();
        require(pendingThresholdAt == 0, "EC: threshold pending");
        pendingThreshold = _threshold;
        pendingThresholdAt = uint64(block.timestamp) + THRESHOLD_CHANGE_DELAY;
        _log("ec_threshold_queued");
    }

    /// @notice Apply a pending threshold change after the 24h timelock.
    function applyThreshold() external onlyDAO nonReentrant {
        require(pendingThresholdAt != 0 && block.timestamp >= pendingThresholdAt, "EC: timelock");
        uint8 newThreshold = pendingThreshold;
        if (newThreshold == 0 || newThreshold > memberCount) revert EC_BadThreshold();
        threshold = newThreshold;
        delete pendingThreshold;
        delete pendingThresholdAt;
        _log("ec_threshold_set");
    }

    /// @notice Cancel a pending threshold change.
    function cancelThreshold() external onlyDAO nonReentrant {
        require(pendingThresholdAt != 0, "EC: no pending threshold");
        delete pendingThreshold;
        delete pendingThresholdAt;
        _log("ec_threshold_cancelled");
    }

    /// @notice Propose rotating the foundation address (48h timelock).
    /// @dev M-5 FIX: An instant unilateral foundation rotation was a key compromise vector.
    ///      An attacker who obtains the foundation key could queue committee changes within
    ///      24h of rotating.  The 48h timelock gives the DAO time to observe and intervene.
    ///      Both the current foundation AND the DAO can apply or cancel the rotation.
    function rotateFoundation(address newFoundation) external nonReentrant {
        require(msg.sender == foundation, "EC: not foundation");
        require(newFoundation != address(0), "EC: foundation=0");
        require(pendingFoundationAt == 0, "EC: rotation pending");
        uint64 effectiveAt = uint64(block.timestamp) + MODULE_CHANGE_DELAY;
        pendingFoundation = newFoundation;
        pendingFoundationAt = effectiveAt;
        emit FoundationRotationProposed(newFoundation, effectiveAt);
        _log("ec_foundation_rotation_proposed");
    }

    /// @notice Apply a pending foundation rotation after the 48-hour timelock.
    function applyFoundationRotation() external nonReentrant {
        require(msg.sender == dao || msg.sender == foundation, "EC: not authorized");
        require(pendingFoundationAt != 0, "EC: no pending rotation");
        require(block.timestamp >= pendingFoundationAt, "EC: rotation timelock");
        address old = foundation;
        foundation = pendingFoundation;
        delete pendingFoundation;
        delete pendingFoundationAt;
        emit FoundationRotated(old, foundation);
        _log("ec_foundation_rotated");
    }

    /// @notice Cancel a pending foundation rotation.
    function cancelFoundationRotation() external nonReentrant {
        require(msg.sender == dao || msg.sender == foundation, "EC: not authorized");
        require(pendingFoundationAt != 0, "EC: no pending rotation");
        delete pendingFoundation;
        delete pendingFoundationAt;
        _log("ec_foundation_rotation_cancelled");
    }

    // ───────────────────────────────── Actions

    function daoToggle(bool halt, string calldata reason) external onlyDAO nonReentrant {
        _enforceCooldown();
        lastToggleTs = uint64(block.timestamp);
        breaker.toggle(halt, reason);
        emit DAOToggled(halt, reason);
        _logEv(address(breaker), halt ? "breaker_on" : "breaker_off", 0, reason);
    }

    /// Committee member casts a vote to (un)halt.
    function committeeVote(bool halt, string calldata reason) external nonReentrant {
        if (!isMember[msg.sender]) revert EC_NotMember();

        if (halt) {
            if (haltVotingStartTime > 0 && block.timestamp > haltVotingStartTime + voteExpiryPeriod) {
                approvalsHalt = 0;
                haltVotingStartTime = uint64(block.timestamp);
                epoch++; // Expire old votes
            } else if (haltVotingStartTime < 1) {
                haltVotingStartTime = uint64(block.timestamp);
            }
            
            if (lastVotedHaltEpoch[msg.sender] == epoch) revert EC_AlreadyVoted();
            lastVotedHaltEpoch[msg.sender] = epoch;
            approvalsHalt += 1;
            emit CommitteeVote(msg.sender, true, approvalsHalt, reason);
            if (approvalsHalt >= threshold) {
                _enforceCooldown();
                lastToggleTs = uint64(block.timestamp);
                _resetVotes(); // reset both sides before external interactions
                breaker.toggle(true, reason);
                emit CommitteeTriggered(true, reason);
                _log("ec_trigger_halt");
            }
            _logEv(msg.sender, "ec_vote_halt", approvalsHalt, reason);
        } else {
            if (unhaltVotingStartTime > 0 && block.timestamp > unhaltVotingStartTime + voteExpiryPeriod) {
                approvalsUnhalt = 0;
                unhaltVotingStartTime = uint64(block.timestamp);
                epoch++; // Expire old votes
            } else if (unhaltVotingStartTime < 1) {
                unhaltVotingStartTime = uint64(block.timestamp);
            }
            
            if (lastVotedUnhaltEpoch[msg.sender] == epoch) revert EC_AlreadyVoted();
            lastVotedUnhaltEpoch[msg.sender] = epoch;
            approvalsUnhalt += 1;
            emit CommitteeVote(msg.sender, false, approvalsUnhalt, reason);
            if (approvalsUnhalt >= threshold) {
                _enforceCooldown();
                lastToggleTs = uint64(block.timestamp);
                _resetVotes();
                breaker.toggle(false, reason);
                emit CommitteeTriggered(false, reason);
                _log("ec_trigger_unhalt");
            }
            _logEv(msg.sender, "ec_vote_unhalt", approvalsUnhalt, reason);
        }
    }

    // ───────────────────────────────── Views

    function hasVotedHalt(address m) external view returns (bool) { return lastVotedHaltEpoch[m] == epoch; }
    function hasVotedUnhalt(address m) external view returns (bool) { return lastVotedUnhaltEpoch[m] == epoch; }

    function timeSinceLastToggle() external view returns (uint64) {
        if (lastToggleTs < 1) return type(uint64).max;
        return uint64(block.timestamp) - lastToggleTs;
    }

    // ───────────────────────────────── Internals

    function _resetVotes() internal {
        // Reset counts; per-member flags remain true for this epoch but won't matter
        approvalsHalt = 0;
        approvalsUnhalt = 0;
        epoch++;
        // M-3 FIX: Reset vote timers
        haltVotingStartTime = 0;
        unhaltVotingStartTime = 0;
    }

    function _enforceCooldown() internal view {
        if (lastToggleTs < 1) return;
        if (uint64(block.timestamp) < lastToggleTs + minCooldown) revert EC_Cooldown();
    }

    function _log(string memory action) internal {
        if (address(ledger) != address(0)) { try ledger.logSystemEvent(address(this), action, msg.sender) {} catch { emit LedgerLogFailed(address(this), action); } }
    }
    function _logEv(address who, string memory action, uint256 amount, string memory note) internal {
        if (address(ledger) != address(0)) { try ledger.logEvent(who, action, amount, note) {} catch { emit LedgerLogFailed(who, action); } }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // I-12 FIX: LAST-RESORT RECOVERY — When both owner AND DAO are compromised
    // ═══════════════════════════════════════════════════════════════════════
    // Requirements:
    //   1) System must already be halted (breaker active)
    //   2) Supermajority of emergency committee (ALL members minus 1) must approve
    //   3) 14-day timelock after approvals reached
    //   4) Target contract must implement Ownable (transferOwnership)
    // This is intentionally heavyweight to prevent abuse.

    struct RecoveryProposal {
        address target;      // The contract whose ownership to transfer
        address newOwner;    // Proposed new owner
        uint8   approvals;
        uint64  unlockTime;
        bool    executed;
        uint256 epoch;       // Tied to committee epoch
    }

    mapping(bytes32 => RecoveryProposal) public recoveryProposals;
    mapping(bytes32 => bool) public recoveryCancelled;
    mapping(bytes32 => mapping(address => bool)) public recoveryVoted;
    mapping(bytes32 => mapping(address => bool)) public recoveryCancelVoted;
    mapping(bytes32 => uint8) public recoveryCancelApprovals;

    uint64 public constant RECOVERY_TIMELOCK = 14 days;

    event RecoveryProposed(bytes32 indexed id, address target, address newOwner);
    event RecoveryApproved(bytes32 indexed id, address member, uint8 approvals);
    event RecoveryCancelApproved(bytes32 indexed id, address member, uint8 approvals);
    event RecoveryExecuted(bytes32 indexed id, address target, address newOwner);
    event RecoveryCancelled(bytes32 indexed id);

    function proposeRecovery(address target, address newOwner) external nonReentrant returns (bytes32 id) {
        require(isMember[msg.sender], "EC: not member");
        require(target != address(0) && newOwner != address(0), "EC: zero");
        // System must be halted first
        require(breaker.halted(), "EC: system must be halted");

        try Ownable(target).emergencyController() returns (address controller) {
            require(controller == address(this), "EC: target not recovery-enabled");
        } catch {
            revert("EC: target not recovery-enabled");
        }

        id = keccak256(abi.encode(target, newOwner, epoch));
        require(recoveryProposals[id].target == address(0), "EC: already proposed");

        recoveryProposals[id] = RecoveryProposal({
            target: target,
            newOwner: newOwner,
            approvals: 1,
            unlockTime: 0,
            executed: false,
            epoch: epoch
        });
        recoveryVoted[id][msg.sender] = true;

        emit RecoveryProposed(id, target, newOwner);
        _log("recovery_proposed");
    }

    function approveRecovery(bytes32 id) external nonReentrant {
        require(isMember[msg.sender], "EC: not member");
        RecoveryProposal storage p = recoveryProposals[id];
        require(p.target != address(0), "EC: no proposal");
        require(!p.executed, "EC: already executed");
        require(!recoveryCancelled[id], "EC: cancelled");
        require(p.epoch == epoch, "EC: stale proposal");
        require(!recoveryVoted[id][msg.sender], "EC: already voted");
        require(breaker.halted(), "EC: system must be halted");

        recoveryVoted[id][msg.sender] = true;
        p.approvals++;

        // Supermajority: all members minus 1
        uint8 required = memberCount > 1 ? memberCount - 1 : 1;
        if (p.approvals >= required && p.unlockTime == 0) {
            p.unlockTime = uint64(block.timestamp) + RECOVERY_TIMELOCK;
        }

        emit RecoveryApproved(id, msg.sender, p.approvals);
        _log("recovery_approved");
    }

    function executeRecovery(bytes32 id) external nonReentrant {
        require(isMember[msg.sender], "EC: not member");
        RecoveryProposal storage p = recoveryProposals[id];
        require(p.target != address(0) && !p.executed, "EC: invalid");
        require(!recoveryCancelled[id], "EC: cancelled");
        require(p.epoch == epoch, "EC: stale proposal");
        require(p.unlockTime > 0, "EC: not approved");
        require(block.timestamp >= p.unlockTime, "EC: timelock active");
        require(breaker.halted(), "EC: system must be halted");

        p.executed = true;

        // Transfer ownership of target contract through the emergency-only recovery hook.
        Ownable(p.target).emergencyTransferOwnership(p.newOwner);

        emit RecoveryExecuted(id, p.target, p.newOwner);
        _log("recovery_executed");
    }

    function cancelRecovery(bytes32 id) external nonReentrant {
        RecoveryProposal storage p = recoveryProposals[id];
        require(p.target != address(0) && !p.executed, "EC: invalid");
        require(!recoveryCancelled[id], "EC: cancelled");

        if (msg.sender == dao) {
            recoveryCancelled[id] = true;
            emit RecoveryCancelled(id);
            _log("recovery_cancelled");
            return;
        }

        require(isMember[msg.sender], "EC: not authorized");
        require(p.epoch == epoch, "EC: stale proposal");
        require(!recoveryCancelVoted[id][msg.sender], "EC: already voted");

        recoveryCancelVoted[id][msg.sender] = true;
        uint8 approvals = recoveryCancelApprovals[id] + 1;
        recoveryCancelApprovals[id] = approvals;
        emit RecoveryCancelApproved(id, msg.sender, approvals);

        uint8 required = memberCount > 1 ? memberCount - 1 : 1;
        if (approvals < required) {
            _log("recovery_cancel_vote");
            return;
        }

        recoveryCancelled[id] = true;
        emit RecoveryCancelled(id);
        _log("recovery_cancelled");
    }

    /// @notice Refresh a recovery proposal's epoch after committee reset so it is not stale
    /// @dev Only callable by DAO when recovery is in progress but committee was reset
    function refreshRecoveryEpoch(bytes32 id) external nonReentrant {
        require(msg.sender == dao, "EC: not DAO");
        RecoveryProposal storage p = recoveryProposals[id];
        require(p.target != address(0) && !p.executed, "EC: invalid");
        require(!recoveryCancelled[id], "EC: cancelled");
        require(p.epoch != epoch, "EC: already current");
        require(breaker.halted(), "EC: system must be halted");

        p.epoch = epoch;
        // Reset approvals — new committee must re-approve
        p.approvals = 0;
        p.unlockTime = 0;

        _log("recovery_epoch_refreshed");
    }
}