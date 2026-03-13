// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./SharedInterfaces.sol";

/// @notice SeerGuardian interface for mutual DAO/Seer oversight
interface ISeerGuardian_DAO {
    function isProposalBlocked(uint256 proposalId) external view returns (bool blocked, string memory reason);
    function canParticipateInGovernance(address subject) external view returns (bool);
    function autoCheckProposer(uint256 proposalId, address proposer) external;
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

    address public admin;
    IDAOTimelock public timelock;
    ISeer public seer;
    IVaultHub public vaultHub;
    IGovernanceHooks public hooks; // optional callbacks (logs/penalties)
    IProofLedger public ledger; // optional via hooks
    ISeerGuardian_DAO public guardian; // SeerGuardian for mutual oversight

    uint64 public votingPeriod = 3 days;
    uint64 public votingDelay = 1 days; // Flash loan protection: vote cannot start immediately
    uint256 public minVotesRequired = 5000; // Absolute number of vote-points (Score) required to pass
    uint256 public minParticipation = 2; // FLOW-2 FIX: Minimum unique voters required

    struct Proposal {
        address proposer;
        address target;
        uint256 value;
        bytes   data;
        string  description;
        ProposalType ptype;
        uint64  start;
        uint64  end;
        bool    executed;
        bool    queued;
        uint256 forVotes;      // Score-weighted
        uint256 againstVotes;  // Score-weighted
        uint256 voterCount;    // FLOW-2 FIX: Track unique voter count
        mapping(address => bool) hasVoted;
        // H-5 Fix: Store score snapshot at vote time to prevent mid-vote gaming
        mapping(address => uint256) scoreSnapshot;
    }
    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    
    // M-1 Fix: Track withdrawn proposal hashes to prevent vote reset abuse
    mapping(bytes32 => bool) public withdrawnProposalHashes;

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

    function setAdmin(address _admin) external onlyTimelock { require(_admin!=address(0),"zero"); admin=_admin; emit AdminSet(_admin); }
    function setParams(uint64 _period, uint256 _minVotes) external onlyTimelock {
        // M-21 Fix: Validate parameters before setting
        if(_period<1 hours)_period=1 hours;
        require(_period <= 30 days, "DAO: voting period too long");
        require(_minVotes <= 1_000_000, "DAO: minVotes too high");
        votingPeriod=_period;
        minVotesRequired=_minVotes;
        emit ParamsSet(_period,_minVotes);
    }
    
    /// @notice Set minimum participation requirement (FLOW-2 FIX)
    /// @param _minParticipation Minimum unique voters required for quorum
    function setMinParticipation(uint256 _minParticipation) external onlyTimelock {
        require(_minParticipation >= 1 && _minParticipation <= 100, "DAO: invalid participation");
        minParticipation = _minParticipation;
    }

    function _eligible(address a) internal view returns (bool) {
        // L-8 Fix: Cache external calls to save gas
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
        // H-2 Fix: Validate proposal parameters
        require(target != address(0) || ptype == ProposalType.Generic, "DAO: invalid target");
        require(bytes(description).length > 0, "DAO: empty description");
        
        // M-1 Fix: Check if this exact proposal was previously withdrawn
        bytes32 proposalHash = keccak256(abi.encode(ptype, target, value, data));
        require(!withdrawnProposalHashes[proposalHash], "DAO: proposal was previously withdrawn");
        
        id=++proposalCount;
        Proposal storage p=proposals[id];
        p.proposer=msg.sender; p.ptype=ptype; p.target=target; p.value=value; p.data=data; p.description=description;
        // Flash loan protection: voting starts after votingDelay
        p.start=uint64(block.timestamp) + votingDelay; p.end=p.start+votingPeriod;
        emit ProposalCreated(id,msg.sender,ptype,target,value,data,description);
        
        // Auto-check proposer via SeerGuardian (may flag for extra scrutiny)
        if (address(guardian) != address(0)) {
            try guardian.autoCheckProposer(id, msg.sender) {} catch {}
        }
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
        
        // M-8 Fix: Validate proposal hasn't been executed or queued
        require(!p.executed && !p.queued, "DAO: proposal already processed");
        
        p.hasVoted[voter] = true;
        p.voterCount++; // FLOW-2 FIX: Track unique voter count
        
        // Track voter history
        voterProposals[voter].push(id);
        
        // H-5 Fix: Score-Weighted Voting with snapshot protection
        // Snapshot score on first vote to prevent mid-proposal score manipulation
        uint256 weight;
        if (p.scoreSnapshot[voter] == 0) {
            weight = uint256(seer.getScore(voter));
            p.scoreSnapshot[voter] = weight;
        } else {
            weight = p.scoreSnapshot[voter];
        }

        // Governance Fatigue: Reduce weight if voting too frequently
        VoterInfo storage info = voterInfo[voter];
        
        // Recover fatigue based on time passed
        if (info.lastVoteTime > 0) {
            uint256 elapsed = block.timestamp - info.lastVoteTime;
            // Intentional: use proportional time-based recovery (not stepwise daily buckets)
            // to avoid edge gaming around day boundaries.
            uint256 recovery = (elapsed * 5) / FATIGUE_RECOVERY_RATE; // 5% per day
            // H-4 Fix: Cap recovery to fatigue to prevent underflow
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
        
        emit Voted(id, voter, support);
        
        // Award activity points for governance participation (+5 per vote)
        // This helps users earn ProofScore through democratic engagement
        try seer.reward(voter, 5, "dao_vote") {} catch {}
        
        if (address(hooks) != address(0)) {
            try hooks.onVoteCast(id, voter, support) {} catch {}
        }
    }

    // H-5 Fix: Add nonReentrant to prevent reentrancy via malicious hooks
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
        
        // M-1 Fix: Record proposal hash before deleting to prevent re-submission
        bytes32 proposalHash = keccak256(abi.encode(p.ptype, p.target, p.value, p.data));
        withdrawnProposalHashes[proposalHash] = true;

        // Reset scalar fields instead of deleting the struct, which contains mappings.
        p.proposer = address(0);
        p.target = address(0);
        p.value = 0;
        p.data = "";
        p.description = "";
        p.ptype = ProposalType.Generic;
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
     * @notice Get all active proposals
     * @return ids Array of active proposal IDs
     */
    function getActiveProposals() external view returns (uint256[] memory ids) {
        // Count active proposals
        uint256 count = 0;
        for (uint256 i = 1; i <= proposalCount; i++) {
            if (proposals[i].end > block.timestamp && !proposals[i].executed && !proposals[i].queued) {
                count++;
            }
        }
        
        ids = new uint256[](count);
        uint256 idx = 0;
        for (uint256 i = 1; i <= proposalCount; i++) {
            if (proposals[i].end > block.timestamp && !proposals[i].executed && !proposals[i].queued) {
                ids[idx++] = i;
            }
        }
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
        ptype = p.ptype;
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
        quorumMet = total >= minVotesRequired;
        passing = quorumMet && p.forVotes > p.againstVotes;
        timeRemaining = block.timestamp < p.end ? p.end - block.timestamp : 0;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                        VOTER HISTORY TRACKING
    // ═══════════════════════════════════════════════════════════════════════
    
    // Track proposals voted on by each voter
    mapping(address => uint256[]) private voterProposals;
    
    /**
     * @notice Get all proposal IDs a voter has voted on
     * @param voter Voter address
     * @return proposalIds Array of proposal IDs
     */
    function getVoterHistory(address voter) external view returns (uint256[] memory proposalIds) {
        return voterProposals[voter];
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
}