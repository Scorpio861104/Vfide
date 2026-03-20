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

contract EmergencyControl {
    event ModulesSet(address dao, address breaker, address ledger);
    event CooldownSet(uint64 secondsMin);
    event CommitteeReset(uint8 threshold, address[] members);
    event MemberAdded(address member);
    event MemberRemoved(address member);
    event CommitteeVote(address indexed member, bool halt, uint8 approvals, string reason);
    event CommitteeTriggered(bool halt, string reason);
    event DAOToggled(bool halt, string reason);

    address public dao;
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

    // Per-stance voting (separate counters for halt=true vs halt=false)
    uint256 public epoch;
    mapping(address => uint256) public lastVotedHaltEpoch;
    mapping(address => uint256) public lastVotedUnhaltEpoch;
    uint8 public approvalsHalt;
    uint8 public approvalsUnhalt;
    
    uint64 public voteExpiryPeriod = 7 days;
    uint64 public haltVotingStartTime;
    uint64 public unhaltVotingStartTime;

    modifier onlyDAO() {
        _checkDAO();
        _;
    }

    function _checkDAO() internal view {
        if (msg.sender != dao) revert EC_NotDAO();
    }

    constructor(address _dao, address _breaker, address _ledger) {
        if (_dao == address(0) || _breaker == address(0)) revert EC_Zero();
        dao = _dao;
        breaker = IEmergencyBreaker(_breaker);
        ledger = IProofLedger(_ledger);
        epoch = 1;
        emit ModulesSet(_dao, _breaker, _ledger);
    }

    // ───────────────────────────────── Admin / config

    function setModules(address _dao, address _breaker, address _ledger) external onlyDAO {
        if (_dao == address(0) || _breaker == address(0)) revert EC_Zero();
        dao = _dao; breaker = IEmergencyBreaker(_breaker); ledger = IProofLedger(_ledger);
        emit ModulesSet(_dao, _breaker, _ledger);
        _log("ec_modules_set");
    }

    function setCooldown(uint64 secondsMin) external onlyDAO {
        minCooldown = secondsMin;
        emit CooldownSet(secondsMin);
        _log("ec_cooldown_set");
    }

    function resetCommittee(uint8 _threshold, address[] calldata members) external onlyDAO {
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

    function resetVotes() external onlyDAO {
        _resetVotes();
        haltVotingStartTime = 0;
        unhaltVotingStartTime = 0;
        _log("ec_votes_reset");
    }

    function addMember(address m) external onlyDAO {
        if (m == address(0)) revert EC_Zero();
        if (isMember[m]) revert EC_AlreadyMember();
        isMember[m] = true; memberCount += 1;
        currentMembers.push(m);
        emit MemberAdded(m);
        _log("ec_member_add");
        // threshold unchanged; DAO should adjust separately if desired
    }

    function removeMember(address m) external onlyDAO {
        if (!isMember[m]) revert EC_NotMember();
        isMember[m] = false; memberCount -= 1;
        
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

    function setThreshold(uint8 _threshold) external onlyDAO {
        if (_threshold == 0 || _threshold > memberCount) revert EC_BadThreshold();
        threshold = _threshold;
        _log("ec_threshold_set");
    }

    // ───────────────────────────────── Actions

    function daoToggle(bool halt, string calldata reason) external onlyDAO {
        _enforceCooldown();
        lastToggleTs = uint64(block.timestamp);
        breaker.toggle(halt, reason);
        emit DAOToggled(halt, reason);
        _logEv(address(breaker), halt ? "breaker_on" : "breaker_off", 0, reason);
    }

    /// Committee member casts a vote to (un)halt.
    function committeeVote(bool halt, string calldata reason) external {
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
    mapping(bytes32 => mapping(address => bool)) public recoveryVoted;

    uint64 public constant RECOVERY_TIMELOCK = 14 days;

    event RecoveryProposed(bytes32 indexed id, address target, address newOwner);
    event RecoveryApproved(bytes32 indexed id, address member, uint8 approvals);
    event RecoveryExecuted(bytes32 indexed id, address target, address newOwner);
    event RecoveryCancelled(bytes32 indexed id);

    function proposeRecovery(address target, address newOwner) external returns (bytes32 id) {
        require(isMember[msg.sender], "EC: not member");
        require(target != address(0) && newOwner != address(0), "EC: zero");
        // System must be halted first
        require(breaker.halted(), "EC: system must be halted");

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

    function approveRecovery(bytes32 id) external {
        require(isMember[msg.sender], "EC: not member");
        RecoveryProposal storage p = recoveryProposals[id];
        require(p.target != address(0), "EC: no proposal");
        require(!p.executed, "EC: already executed");
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

    function executeRecovery(bytes32 id) external {
        require(isMember[msg.sender], "EC: not member");
        RecoveryProposal storage p = recoveryProposals[id];
        require(p.target != address(0) && !p.executed, "EC: invalid");
        require(p.epoch == epoch, "EC: stale proposal");
        require(p.unlockTime > 0, "EC: not approved");
        require(block.timestamp >= p.unlockTime, "EC: timelock active");
        require(breaker.halted(), "EC: system must be halted");

        p.executed = true;

        // Transfer ownership of target contract
        Ownable(p.target).transferOwnership(p.newOwner);

        emit RecoveryExecuted(id, p.target, p.newOwner);
        _log("recovery_executed");
    }

    function cancelRecovery(bytes32 id) external {
        require(msg.sender == dao || isMember[msg.sender], "EC: not authorized");
        RecoveryProposal storage p = recoveryProposals[id];
        require(p.target != address(0) && !p.executed, "EC: invalid");

        p.executed = true; // Prevent re-use
        emit RecoveryCancelled(id);
        _log("recovery_cancelled");
    }
}