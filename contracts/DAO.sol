// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./SharedInterfaces.sol";

/// @notice SeerGuardian interface for mutual DAO/Seer oversight
interface ISeerGuardian_DAO {
    function isProposalBlocked(uint256 proposalId) external view returns (bool blocked, string memory reason);
    function canParticipateInGovernance(address subject) external view returns (bool);
    function autoCheckProposer(uint256 proposalId, address proposer) external;
}

interface ISeerAutonomous_DAO {
    function beforeAction(address subject, uint8 action, uint256 amount, address counterparty) external returns (uint8);
}

error DAO_NotAdmin();
error DAO_NotTimelock();
error DAO_Zero();
error DAO_NotEligible();
error DAO_UnknownProposal();
error DAO_AlreadyVoted();
error DAO_VoteEnded();
error DAO_VoteNotStarted();
error DAO_ProposalFlagged(string reason);
error DAO_ProposalCooldownActive(uint256 readyAt);
error DAO_ProposalTargetNotAllowed(uint8 ptype, address target);
error DAO_ProposalSelectorNotAllowed(uint8 ptype, bytes4 selector);
error DAO_ActionBlocked(uint8 result);

contract DAO is ReentrancyGuard {
    enum ProposalType { Generic, Financial, ProtocolChange, SecurityAction }

    event ModulesSet(address timelock, address seer, address hub, address hooks, address council);
    event AdminSet(address admin);
    event ParamsSet(uint64 votingPeriod, uint256 minVotesRequired);
    event ProposalCreated(uint256 id, address proposer, ProposalType ptype, address target, uint256 value, bytes data, string description);
    event Voted(uint256 id, address voter, bool support);
    event Finalized(uint256 id, bool passed);
    event Queued(uint256 id, bytes32 timelockId);
    event Executed(uint256 id);
    event ProposalStateChanged(uint256 indexed id, string oldState, string newState);
    event DisputeFlagged(address indexed user, address indexed caller, string reason);
    event VoteDelegated(address indexed delegator, address indexed delegate);
    event ProposalWithdrawn(uint256 id, address indexed proposer);
    event ProposalCooldownSet(uint64 cooldown);
    event ProposalTypeTargetPolicySet(ProposalType indexed ptype, address indexed target, bool allowed);
    event ProposalTypeSelectorPolicySet(ProposalType indexed ptype, bytes4 indexed selector, bool allowed);
    event SeerAutonomousSet(address seerAutonomous);
    event EmergencyQuorumRescueInitiated(uint256 readyAt);
    event EmergencyQuorumRescueExecuted(uint256 newMinVotes, uint256 newMinParticipation);
    event EmergencyQuorumRescueCancelled();
    event EmergencyTimelockReplacementProposed(address indexed newTimelock, uint64 readyAt);
    event EmergencyTimelockReplacementExecuted(address indexed newTimelock);

    address public admin;
    IDAOTimelock public timelock;
    ISeer public seer;
    IVaultHub public vaultHub;
    IGovernanceHooks public hooks; // optional callbacks (logs/penalties)
    IProofLedger public ledger; // optional via hooks
    ISeerGuardian_DAO public guardian; // SeerGuardian for mutual oversight
    ISeerAutonomous_DAO public seerAutonomous; // optional proactive Seer automation checks

    uint64 public votingPeriod = 3 days;
    uint64 public votingDelay = 1 days; // Flash loan protection: vote cannot start immediately
    uint64 public proposalCooldown = 1 hours;
    uint256 public minVotesRequired = 5000; // Absolute number of vote-points (Score) required to pass
    uint256 public minParticipation = 10;
    
    /// @notice Emergency quorum rescue — breaks governance deadlock when quorum is unreachable
    uint256 public constant EMERGENCY_RESCUE_DELAY = 14 days;
    uint64 public emergencyRescueReadyAt; // 0 = not initiated
        // F-22 FIX: Emergency timelock replacement for DAO circular dependency recovery
        uint256 public constant EMERGENCY_TIMELOCK_DELAY = 30 days;
        address public pendingEmergencyTimelock;
        uint64  public emergencyTimelockReadyAt;
    mapping(address => uint256) public lastVoteRewardDay;
    mapping(address => uint64) public lastProposalAt;
    mapping(ProposalType => mapping(address => bool)) public proposalTypeTargetAllowed;
    mapping(ProposalType => uint256) public proposalTypeTargetPolicyCount;
    mapping(ProposalType => mapping(bytes4 => bool)) public proposalTypeSelectorAllowed;
    mapping(ProposalType => uint256) public proposalTypeSelectorPolicyCount;

    struct Proposal {
        address proposer;
        address target;
        uint256 value;
        bytes   data;
        string  description;
        ProposalType proposalType; // L-02: renamed from ptype for clarity (ptype was inconsistent with the type name)
        uint64  start;
        uint64  end;
        bool    executed;
        bool    queued;
        uint256 forVotes;      // Score-weighted
        uint256 againstVotes;  // Score-weighted
        uint256 voterCount;    // FLOW-2 FIX: Track unique voter count
        mapping(address => bool) hasVoted;
        mapping(address => uint256) scoreSnapshot;
    }
    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    
    //           so identical proposals can be re-submitted after the cooldown window elapses.
    uint64 public withdrawnHashCooldown = 7 days;
    mapping(bytes32 => uint64) public withdrawnProposalHashes; // stores block.timestamp when withdrawn

    /**
     * Allow vote delegation - REMOVED for security/simplicity in v1
     */
    struct VoterInfo {
        uint256 lastVoteTime;
        uint256 fatigue; // Accumulated fatigue (percentage points)
    }
    mapping(address => VoterInfo) public voterInfo;
    uint256 public constant FATIGUE_RECOVERY_RATE = 1 days; // Recover 5% per day
    uint256 public constant FATIGUE_PER_VOTE = 5; // 5% fatigue per vote

    modifier onlyAdmin() {
        _checkAdmin();
        _;
    }

    modifier onlyTimelock() {
        if (msg.sender != address(timelock)) revert DAO_NotTimelock();
        _;
    }

    function _checkAdmin() internal view {
        if (msg.sender != admin) revert DAO_NotAdmin();
    }

    constructor(address _admin, address _timelock, address _seer, address _hub, address _hooks) {
        require(_admin!=address(0) && _timelock!=address(0) && _seer!=address(0) && _hub!=address(0), "zero");
        admin=_admin; timelock=IDAOTimelock(_timelock); seer=ISeer(_seer); vaultHub=IVaultHub(_hub); hooks=IGovernanceHooks(_hooks);
        emit ModulesSet(_timelock,_seer,_hub,_hooks,address(0)); emit AdminSet(_admin);
    }

    function setModules(address _timelock, address _seer, address _hub, address _hooks) external onlyTimelock {
        require(_timelock!=address(0)&&_seer!=address(0)&&_hub!=address(0),"zero");
        timelock=IDAOTimelock(_timelock); seer=ISeer(_seer); vaultHub=IVaultHub(_hub); hooks=IGovernanceHooks(_hooks);
        emit ModulesSet(_timelock,_seer,_hub,_hooks,address(0));
    }
    
    /// @notice Set the SeerGuardian for mutual DAO/Seer oversight
    function setGuardian(address _guardian) external onlyTimelock {
        guardian = ISeerGuardian_DAO(_guardian);
    }

    /// @notice Set SeerAutonomous for proactive pre-action governance enforcement
    function setSeerAutonomous(address _seerAutonomous) external onlyTimelock {
        seerAutonomous = ISeerAutonomous_DAO(_seerAutonomous);
        emit SeerAutonomousSet(_seerAutonomous);
    }

    function setAdmin(address _admin) external onlyTimelock { require(_admin!=address(0),"zero"); admin=_admin; emit AdminSet(_admin); }
    function setParams(uint64 _period, uint256 _minVotes) external onlyTimelock {
        if(_period<1 hours)_period=1 hours;
        require(_period <= 30 days, "DAO: voting period too long");
        require(_minVotes >= 100 && _minVotes <= 1_000_000, "DAO: minVotes out of range");
        votingPeriod=_period;
        minVotesRequired=_minVotes;
        emit ParamsSet(_period,_minVotes);
    }
    
    /// @notice Set minimum participation requirement (FLOW-2 FIX)
    /// @param _minParticipation Minimum unique voters required for quorum
    function setMinParticipation(uint256 _minParticipation) external onlyTimelock {
        require(_minParticipation >= 3 && _minParticipation <= 100, "DAO: invalid participation");
        minParticipation = _minParticipation;
    }

    // ═══════════════════════════════════════════════════════════════════════
    //             EMERGENCY QUORUM RESCUE (governance deadlock breaker)
    // ═══════════════════════════════════════════════════════════════════════

    /// @notice Initiate emergency quorum rescue — 14-day warmup before execution
    /// @dev Only admin can initiate. Provides on-chain notice period for community awareness.
    function initiateEmergencyQuorumRescue() external onlyAdmin {
        emergencyRescueReadyAt = uint64(block.timestamp + EMERGENCY_RESCUE_DELAY);
        emit EmergencyQuorumRescueInitiated(emergencyRescueReadyAt);
    }

    /// @notice Cancel a pending emergency quorum rescue
    function cancelEmergencyQuorumRescue() external onlyAdmin {
        require(emergencyRescueReadyAt != 0, "DAO: no rescue pending");
        emergencyRescueReadyAt = 0;
        emit EmergencyQuorumRescueCancelled();
    }

    /// @notice Execute emergency quorum rescue after warmup period
    /// @dev Can only REDUCE quorum parameters. Bounded by same minimums as setParams/setMinParticipation.
    /// @param _minVotes New minVotesRequired (must be < current, >= 100)
    /// @param _minParticipation New minParticipation (must be <= current, >= 3)
    function executeEmergencyQuorumRescue(uint256 _minVotes, uint256 _minParticipation) external onlyAdmin {
        require(emergencyRescueReadyAt != 0, "DAO: no rescue pending");
        require(block.timestamp >= emergencyRescueReadyAt, "DAO: rescue warmup not elapsed");
        // F-21 FIX: New quorum must be >= 10% of the current value to prevent essentially zeroing quorum
        require(_minVotes >= minVotesRequired / 10, "DAO: quorum too low (must be >= 10% of current)");
        require(_minVotes < minVotesRequired, "DAO: must reduce minVotes");
        require(_minParticipation >= 3, "DAO: min participation too low");
        require(_minParticipation <= minParticipation, "DAO: must reduce or keep minParticipation");
        
        emergencyRescueReadyAt = 0;
        minVotesRequired = _minVotes;
        minParticipation = _minParticipation;
        emit EmergencyQuorumRescueExecuted(_minVotes, _minParticipation);
    }

    /// @notice Set minimum spacing between proposals by the same proposer
    function setProposalCooldown(uint64 _cooldown) external onlyTimelock {
            /// @notice F-22 FIX: Propose a new timelock address for emergency replacement (30-day delay)
            /// @dev Required when the timelock contract has a bug or key compromise and DAO cannot govern itself.
            function proposeEmergencyTimelockReplacement(address newTimelock) external onlyAdmin {
                require(newTimelock != address(0), "DAO: zero");
                pendingEmergencyTimelock = newTimelock;
                emergencyTimelockReadyAt = uint64(block.timestamp) + uint64(EMERGENCY_TIMELOCK_DELAY);
                emit EmergencyTimelockReplacementProposed(newTimelock, emergencyTimelockReadyAt);
            }

            /// @notice F-22 FIX: Execute emergency timelock replacement after 30-day delay
            function executeEmergencyTimelockReplacement() external onlyAdmin {
                require(emergencyTimelockReadyAt > 0 && block.timestamp >= emergencyTimelockReadyAt, "DAO: not ready");
                address newTimelock = pendingEmergencyTimelock;
                timelock = IDAOTimelock(newTimelock);
                delete pendingEmergencyTimelock;
                delete emergencyTimelockReadyAt;
                emit EmergencyTimelockReplacementExecuted(newTimelock);
            }

        require(_cooldown <= 30 days, "DAO: cooldown too long");
        proposalCooldown = _cooldown;
        emit ProposalCooldownSet(_cooldown);
    }

    /// @notice Set cooldown before a withdrawn proposal can be re-submitted.
    /// @dev Capped at 90 days — beyond that proposals lose political relevance and
    ///      community members should be free to re-introduce them without restriction.
    function setWithdrawnHashCooldown(uint64 _cooldown) external onlyTimelock {
        require(_cooldown <= 90 days, "DAO: cooldown too long");
        withdrawnHashCooldown = _cooldown;
    }

    /// @notice Configure allowlist policy for proposal type targets
    function setProposalTypeTargetPolicy(ProposalType ptype, address target, bool allowed) external onlyTimelock {
        require(target != address(0), "DAO: invalid target policy");
        bool current = proposalTypeTargetAllowed[ptype][target];
        if (current == allowed) return;

        proposalTypeTargetAllowed[ptype][target] = allowed;
        if (allowed) {
            proposalTypeTargetPolicyCount[ptype] += 1;
        } else {
            proposalTypeTargetPolicyCount[ptype] -= 1;
        }

        emit ProposalTypeTargetPolicySet(ptype, target, allowed);
    }

    /// @notice Configure allowlist policy for proposal type function selectors
    function setProposalTypeSelectorPolicy(ProposalType ptype, bytes4 selector, bool allowed) external onlyTimelock {
        require(selector != bytes4(0), "DAO: invalid selector policy");
        bool current = proposalTypeSelectorAllowed[ptype][selector];
        if (current == allowed) return;

        proposalTypeSelectorAllowed[ptype][selector] = allowed;
        if (allowed) {
            proposalTypeSelectorPolicyCount[ptype] += 1;
        } else {
            proposalTypeSelectorPolicyCount[ptype] -= 1;
        }

        emit ProposalTypeSelectorPolicySet(ptype, selector, allowed);
    }

    function _selector(bytes calldata data) internal pure returns (bytes4 selector) {
        if (data.length < 4) return bytes4(0);
        assembly {
            selector := calldataload(data.offset)
        }
    }

    function _eligible(address a) internal view returns (bool) {
        address vault = vaultHub.vaultOf(a);
        if (vault == address(0)) return false;
        // Check SeerGuardian restrictions (Seer keeps DAO in check)
        if (address(guardian) != address(0)) {
            if (!guardian.canParticipateInGovernance(a)) return false;
        }
        return seer.getScore(a) >= seer.minForGovernance();
    }

    function propose(ProposalType ptype, address target, uint256 value, bytes calldata data, string calldata description) external returns (uint256 id) {
        if(!_eligible(msg.sender)) revert DAO_NotEligible();
        require(target != address(0), "DAO: invalid target");
        require(bytes(description).length > 0, "DAO: empty description");

        if (proposalCooldown > 0 && lastProposalAt[msg.sender] > 0) {
            uint256 readyAt = uint256(lastProposalAt[msg.sender]) + proposalCooldown;
            if (block.timestamp < readyAt) revert DAO_ProposalCooldownActive(readyAt);
        }

        // Optional allowlist matrix by proposal type.
        // Policies are enforced only when configured for a given type, preserving backward compatibility.
        if (target != address(0) && proposalTypeTargetPolicyCount[ptype] > 0 && !proposalTypeTargetAllowed[ptype][target]) {
            revert DAO_ProposalTargetNotAllowed(uint8(ptype), target);
        }
        if (proposalTypeSelectorPolicyCount[ptype] > 0) {
            bytes4 selector = _selector(data);
            if (!proposalTypeSelectorAllowed[ptype][selector]) {
                revert DAO_ProposalSelectorNotAllowed(uint8(ptype), selector);
            }
        }
        
        // Proposer is included in the hash so withdrawal cooldown is scoped per-proposer;
        // this prevents one user's withdrawal from blocking others from submitting the same payload.
        bytes32 proposalHash = keccak256(abi.encode(msg.sender, target, value, data));
        //           can be re-submitted after the withdrawnHashCooldown window elapses.
        uint64 withdrawnAt = withdrawnProposalHashes[proposalHash];
        require(
            withdrawnAt == 0 || block.timestamp >= withdrawnAt + withdrawnHashCooldown,
            "DAO: resubmission cooldown active"
        );

        lastProposalAt[msg.sender] = uint64(block.timestamp);
        
        id=++proposalCount;
        Proposal storage p=proposals[id];
        p.proposer=msg.sender; p.proposalType=ptype; p.target=target; p.value=value; p.data=data; p.description=description;
        // Flash loan protection: voting starts after votingDelay
        p.start=uint64(block.timestamp) + votingDelay; p.end=p.start+votingPeriod;
        emit ProposalCreated(id,msg.sender,ptype,target,value,data,description);
        
        // Auto-check proposer via SeerGuardian (may flag for extra scrutiny)
        if (address(guardian) != address(0)) {
            try guardian.autoCheckProposer(id, msg.sender) {} catch {}
        }

        _enforceSeerAction(msg.sender, 4, value, target); // GovernancePropose
    }

    // function delegateVote(address delegate) external { ... } // Removed

    function vote(uint256 id, bool support) external nonReentrant {
        address voter = msg.sender;
        Proposal storage p = proposals[id];
        // FLOW-1 FIX: Check both start and end are set (proposal exists and wasn't deleted)
        if (p.end == 0 || p.start == 0) revert DAO_UnknownProposal();
        if (block.timestamp < p.start) revert DAO_VoteNotStarted(); // Flash loan protection
        if (block.timestamp >= p.end) revert DAO_VoteEnded();
        if (!_eligible(voter)) revert DAO_NotEligible();
        if (p.hasVoted[voter]) revert DAO_AlreadyVoted();
        
        require(!p.executed && !p.queued, "DAO: proposal already processed");
        
        p.hasVoted[voter] = true;
        p.voterCount++; // FLOW-2 FIX: Track unique voter count
        
        // Track voter history (I-11: capped to prevent unbounded storage growth)
        require(voterProposals[voter].length < 500, "DAO: voter history full");
        voterProposals[voter].push(id);
        
        uint256 rawSnapshot = p.scoreSnapshot[voter];
        uint256 weight;
        if (rawSnapshot == 0) {
            // First vote: take snapshot and store as weight+1
            weight = uint256(seer.getScore(voter));
            p.scoreSnapshot[voter] = weight + 1; // +1 so score-0 is stored as 1, not confused with unset
                    // F-28 FIX: Require voter's score to have been established before the proposal was created.
                    // Prevents a coalition of operators from temporarily boosting a voter's score to manipulate vote weight.
                    uint64 voterLastActivity = seer.lastActivity(voter);
                    require(
                        voterLastActivity > 0 && voterLastActivity < p.start - votingDelay,
                        "DAO: score not stable long enough before proposal"
                    );
        } else {
            weight = rawSnapshot - 1; // decode: subtract the +1 offset
        }

        // Governance Fatigue: Reduce weight if voting too frequently
        VoterInfo storage info = voterInfo[voter];
        
        // Recover fatigue based on time passed
        if (info.lastVoteTime > 0) {
            uint256 elapsed = block.timestamp - info.lastVoteTime;
            // Intentional: use proportional time-based recovery (not stepwise daily buckets)
            // to avoid edge gaming around day boundaries.
            uint256 recovery = (elapsed * 5) / FATIGUE_RECOVERY_RATE; // 5% per day
            if (recovery >= info.fatigue) {
                info.fatigue = 0;
            } else {
                info.fatigue -= recovery;
            }
        }
        
        // Apply fatigue penalty
        if (info.fatigue > 0) {
            // Cap fatigue at 90%
            uint256 penaltyPercent = info.fatigue > 90 ? 90 : info.fatigue;
            weight = weight * (100 - penaltyPercent) / 100;
        }
        
        // Add new fatigue
        info.fatigue += FATIGUE_PER_VOTE;
        info.lastVoteTime = block.timestamp;
        
        if (support) p.forVotes += weight; else p.againstVotes += weight;

        _enforceSeerAction(voter, 3, 0, address(0)); // GovernanceVote
        
        emit Voted(id, voter, support);

        // Avoid double rewards when hooks are configured and already reward voting.
        if (address(hooks) == address(0)) {
            uint256 today = block.timestamp / 1 days;
            if (lastVoteRewardDay[voter] < today) {
                lastVoteRewardDay[voter] = today;
                try seer.reward(voter, 5, "dao_vote") {} catch {}
            }
        }

        if (address(hooks) != address(0)) {
            try hooks.onVoteCast(id, voter, support) {} catch {}
        }
    }

    function finalize(uint256 id) external nonReentrant {
        Proposal storage p=proposals[id];
        // FLOW-3 FIX: Check proposal exists (both start and end must be set)
        if(p.end==0 || p.start==0) revert DAO_UnknownProposal();
        require(block.timestamp>=p.end,"early");
        require(!p.executed&&!p.queued,"done");
        
        // SEER OVERSIGHT: Check if proposal is flagged/blocked by SeerGuardian
        if (address(guardian) != address(0)) {
            (bool blocked, string memory reason) = guardian.isProposalBlocked(id);
            if (blocked) revert DAO_ProposalFlagged(reason);
        }
        
        uint256 total = p.forVotes + p.againstVotes;
        // Quorum is interpreted as absolute number of vote-points required
        // FLOW-2 FIX: Also require minimum number of unique voters
        bool qmet = total >= minVotesRequired && p.voterCount >= minParticipation; 
        bool passed = qmet && p.forVotes > p.againstVotes;
        
        emit Finalized(id,passed);
        if (passed){
            p.queued=true;
            bytes32 tlId = timelock.queueTx(p.target,p.value,p.data);
            emit Queued(id,tlId);
            if (address(hooks)!=address(0)) { try hooks.onProposalQueued(id,p.target,p.value) {} catch {} }
        }
        if (address(hooks)!=address(0)) { try hooks.onFinalized(id,passed) {} catch {} }
    }

    function markExecuted(uint256 id) external onlyAdmin {
        Proposal storage p=proposals[id];
        require(p.queued&&!p.executed,"bad");
        p.executed=true; emit Executed(id);
    }

    function withdrawProposal(uint256 id) external {
        Proposal storage p = proposals[id];
        require(p.proposer == msg.sender, "Not proposer");
        require(!p.executed && !p.queued, "Already processed");
        
        // FLOW-6 FIX: Cannot withdraw proposal once voting has started and votes cast
        // This prevents gaming by withdrawing losing proposals
        require(block.timestamp < p.start || (p.forVotes == 0 && p.againstVotes == 0), 
            "DAO: cannot withdraw after votes cast");
        
        // Must match the proposer-scoped hash used in propose()
        bytes32 proposalHash = keccak256(abi.encode(msg.sender, p.target, p.value, p.data));
        withdrawnProposalHashes[proposalHash] = uint64(block.timestamp);

        // Reset scalar fields instead of deleting the struct, which contains mappings.
        p.proposer = address(0);
        p.target = address(0);
        p.value = 0;
        p.data = "";
        p.description = "";
        p.proposalType = ProposalType.Generic;
        p.start = 0;
        p.end = 0;
        p.executed = false;
        p.queued = false;
        p.forVotes = 0;
        p.againstVotes = 0;
        p.voterCount = 0;

        emit ProposalWithdrawn(id, msg.sender);
    }

    function disputeFlag(address user, string calldata reason) external {
        require(msg.sender != address(0), "Invalid caller");
        // Log the dispute for DAO review
        emit DisputeFlagged(user, msg.sender, reason);
        // DAO can review and override Seer decisions
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                         VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get active proposals with pagination
     * @param offset Starting proposal ID to scan from (0 = start from 1)
     * @param limit Maximum number of active proposals to return
     * @return ids Array of active proposal IDs
     */
    function getActiveProposals(uint256 offset, uint256 limit) public view returns (uint256[] memory ids) {
        if (offset == 0) offset = 1;
        if (limit == 0 || limit > 100) limit = 100;        uint256[] memory tmp = new uint256[](limit);
        uint256 found = 0;
        for (uint256 i = offset; i <= proposalCount && found < limit; i++) {
            if (proposals[i].end > block.timestamp && !proposals[i].executed && !proposals[i].queued) {
                tmp[found++] = i;
            }
        }
        ids = new uint256[](found);
        for (uint256 j = 0; j < found; j++) {
            ids[j] = tmp[j];
        }
    }

    /// @notice Legacy convenience alias — returns first 100 active proposals
    function getActiveProposals() external view returns (uint256[] memory) {
        return getActiveProposals(0, 100);
    }
    
    /**
     * @notice Get proposal details
     * @param id Proposal ID
     */
    function getProposalDetails(uint256 id) external view returns (
        address proposer,
        ProposalType ptype,
        address target,
        uint256 value,
        string memory description,
        uint64 startTime,
        uint64 endTime,
        uint256 forVotes,
        uint256 againstVotes,
        bool executed,
        bool queued
    ) {
        Proposal storage p = proposals[id];
        proposer = p.proposer;
        ptype = p.proposalType;
        target = p.target;
        value = p.value;
        description = p.description;
        startTime = p.start;
        endTime = p.end;
        forVotes = p.forVotes;
        againstVotes = p.againstVotes;
        executed = p.executed;
        queued = p.queued;
    }
    
    /**
     * @notice Check if user has voted on a proposal
     */
    function hasVoted(uint256 id, address voter) external view returns (bool) {
        return proposals[id].hasVoted[voter];
    }
    
    /**
     * @notice Get voter fatigue info
     * @param voter Voter address
     * @return currentFatigue Current fatigue percentage
     * @return lastVoteTime Last vote timestamp
     * @return recoveredSince How much fatigue recovered since last vote
     * @return effectiveFatigue Net fatigue after recovery
     */
    function getFatigueInfo(address voter) external view returns (
        uint256 currentFatigue,
        uint256 lastVoteTime,
        uint256 recoveredSince,
        uint256 effectiveFatigue
    ) {
        VoterInfo storage info = voterInfo[voter];
        currentFatigue = info.fatigue;
        lastVoteTime = info.lastVoteTime;
        
        if (info.lastVoteTime > 0) {
            uint256 elapsed = block.timestamp - info.lastVoteTime;
            recoveredSince = (elapsed * 5) / FATIGUE_RECOVERY_RATE; // 5% per day
            
            if (recoveredSince >= info.fatigue) {
                effectiveFatigue = 0;
            } else {
                effectiveFatigue = info.fatigue - recoveredSince;
            }
        } else {
            recoveredSince = 0;
            effectiveFatigue = 0;
        }
    }
    
    /**
     * @notice Calculate voting power with fatigue
     * @param voter Voter address
     * @return rawScore Base ProofScore
     * @return fatiguePercent Fatigue penalty percentage
     * @return effectivePower Voting power after fatigue
     */
    function getVotingPower(address voter) external view returns (
        uint256 rawScore,
        uint256 fatiguePercent,
        uint256 effectivePower
    ) {
        rawScore = uint256(seer.getScore(voter));
        
        VoterInfo storage info = voterInfo[voter];
        uint256 fatigue = info.fatigue;
        
        // Calculate recovered fatigue
        if (info.lastVoteTime > 0) {
            uint256 elapsed = block.timestamp - info.lastVoteTime;
            // Intentional: mirrors proportional recovery in vote() for consistent preview math.
            uint256 recovery = (elapsed * 5) / FATIGUE_RECOVERY_RATE;
            if (recovery >= fatigue) {
                fatigue = 0;
            } else {
                fatigue -= recovery;
            }
        }
        
        fatiguePercent = fatigue > 90 ? 90 : fatigue;
        effectivePower = rawScore * (100 - fatiguePercent) / 100;
    }
    
    /**
     * @notice Check if user is eligible to vote/propose
     */
    function isEligible(address user) external view returns (bool) {
        return _eligible(user);
    }
    
    /**
     * @notice Get proposal outcome prediction
     */
    function getProposalStatus(uint256 id) external view returns (
        string memory status,
        bool quorumMet,
        bool passing,
        uint256 timeRemaining
    ) {
        Proposal storage p = proposals[id];
        
        if (p.executed) {
            status = "Executed";
        } else if (p.queued) {
            status = "Queued";
        } else if (block.timestamp >= p.end) {
            status = "Ended";
        } else {
            status = "Active";
        }
        
        uint256 total = p.forVotes + p.againstVotes;
        quorumMet = total >= minVotesRequired && p.voterCount >= minParticipation;
        passing = quorumMet && p.forVotes > p.againstVotes;
        timeRemaining = block.timestamp < p.end ? p.end - block.timestamp : 0;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                        VOTER HISTORY TRACKING
    // ═══════════════════════════════════════════════════════════════════════
    
    // Track proposals voted on by each voter
    mapping(address => uint256[]) private voterProposals;
    
    /**
     * @notice Get paginated proposal IDs a voter has voted on
     * @param voter Voter address
     * @param offset Starting index
     * @param limit Maximum results (capped at 200)
     * @return proposalIds Array of proposal IDs
     */
    function getVoterHistory(address voter, uint256 offset, uint256 limit) public view returns (uint256[] memory proposalIds) {
        uint256[] storage all = voterProposals[voter];
        if (offset >= all.length) return new uint256[](0);
        if (limit == 0 || limit > 200) limit = 200;
        uint256 end = offset + limit;
        if (end > all.length) end = all.length;
        proposalIds = new uint256[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            proposalIds[i - offset] = all[i];
        }
    }

    /// @notice Legacy alias — returns first 200 voter proposals
    function getVoterHistory(address voter) external view returns (uint256[] memory) {
        return getVoterHistory(voter, 0, 200);
    }
    
    /**
     * @notice Get voter participation stats
     * @param voter Voter address
     * @return votesTotal Total votes cast
     * @return forVotes Votes in favor
     * @return againstVotes Votes against
     * @return participationRate Percentage of proposals voted on (if >0 proposals exist)
     */
    function getVoterStats(address voter) external view returns (
        uint256 votesTotal,
        uint256 forVotes,
        uint256 againstVotes,
        uint256 participationRate
    ) {
        uint256[] memory ids = voterProposals[voter];
        votesTotal = ids.length;
        
        // We can't track individual vote direction without more storage
        // For now, return total count
        forVotes = 0;
        againstVotes = 0;
        
        if (proposalCount > 0) {
            participationRate = (votesTotal * 10000) / proposalCount;
        }
    }
    
    /**
     * @notice Get batch of proposal details
     */
    function getProposalsBatch(uint256[] calldata ids) external view returns (
        uint256[] memory forVotesCounts,
        uint256[] memory againstVotesCounts,
        bool[] memory executedFlags,
        bool[] memory queuedFlags
    ) {
        forVotesCounts = new uint256[](ids.length);
        againstVotesCounts = new uint256[](ids.length);
        executedFlags = new bool[](ids.length);
        queuedFlags = new bool[](ids.length);
        
        for (uint256 i = 0; i < ids.length; i++) {
            Proposal storage p = proposals[ids[i]];
            forVotesCounts[i] = p.forVotes;
            againstVotesCounts[i] = p.againstVotes;
            executedFlags[i] = p.executed;
            queuedFlags[i] = p.queued;
        }
    }

    function _enforceSeerAction(address subject, uint8 action, uint256 amount, address counterparty) internal {
        address sa = address(seerAutonomous);
        if (sa == address(0)) return;

        uint8 result = 0;
        try seerAutonomous.beforeAction(subject, action, amount, counterparty) returns (uint8 r) {
            result = r;
        } catch {
            revert DAO_ActionBlocked(type(uint8).max);
        }

        // Allowed (0) and Warned (1) may proceed; delayed/blocked/penalized are denied.
        if (result >= 2) revert DAO_ActionBlocked(result);
    }
}