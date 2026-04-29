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
error DAO_NotPendingAdmin();

contract DAO is ReentrancyGuard {
    enum ProposalType { Generic, Financial, ProtocolChange, SecurityAction }

    event ModulesSet(address timelock, address seer, address hub, address hooks, address council);
    event AdminSet(address admin);
    event AdminTransferProposed(address indexed pendingAdmin);
    event AdminTransferCancelled();
    event ParamsSet(uint64 votingPeriod, uint256 minVotesRequired);
    event MinParticipationSet(uint256 minParticipation);
    event CouncilElectionSet(address councilElection);
    event QuorumProfileSynced(uint256 councilSize, uint256 minVotesRequired, uint256 minParticipation);
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
    event RequireProposalPoliciesSet(bool required);
    event EmergencyQuorumRescueInitiated(uint256 readyAt);
    event EmergencyQuorumRescueApproved(); // DAO-03 FIX: Track secondary approval
    event EmergencyQuorumRescueExecuted(uint256 newMinVotes, uint256 newMinParticipation);
    event EmergencyQuorumRescueCancelled();
    event EmergencyTimelockReplacementProposed(address indexed newTimelock, uint64 readyAt);
    event EmergencyTimelockReplacementApproved(); // DAO-03 FIX: Track secondary approval
    event EmergencyTimelockReplacementExecuted(address indexed newTimelock);
    event EmergencyTimelockReplacementCancelled();
    event VoterHistoryPruned(address indexed voter, uint256 removedCount);

    address public admin;
    address public pendingAdmin;
    /// @notice DAO-03 FIX: Secondary admin required to co-approve emergency actions (prevent sole admin bypass)
    address public emergencyApprover;
    // H-4 FIX: Break-glass admin that can replace DAO admin with a 7-day delay, bypassing a
    // potentially compromised timelock and resolving DAO/DAOTimelock circular deadlock.
    address public breakGlassAdmin;
    address public pendingBreakGlassAdmin;
    uint64  public breakGlassAdminReadyAt;
    uint64  public constant BREAK_GLASS_DELAY = 7 days;
    IDAOTimelock public timelock;
    ISeer public seer;
    IVaultHub public vaultHub;
    IGovernanceHooks public hooks; // optional callbacks (logs/penalties)
    IProofLedger public ledger; // optional via hooks
    ISeerGuardian_DAO public guardian; // SeerGuardian for mutual oversight
    ISeerAutonomous_DAO public seerAutonomous; // optional proactive Seer automation checks

    uint64 public votingPeriod = 3 days;
    uint64 public votingDelay = 1 days; // Flash loan protection: vote cannot start immediately
    uint64 public constant VOTE_GRACE_PERIOD = 30 minutes; // Anti-front-running: voting closes early
    uint64 public proposalCooldown = 1 hours;
    uint256 public minVotesRequired = 5000; // Absolute number of vote-points (Score) required to pass
    uint256 public minParticipation = 10;
    ICouncilElection public councilElection; // Added councilElection variable
    
    /// @notice Emergency quorum rescue — breaks governance deadlock when quorum is unreachable
    uint256 public constant EMERGENCY_RESCUE_DELAY = 14 days;
    /// @notice Absolute minimum quorum to prevent cascading reduction (DAO-02 FIX)
    uint256 public constant ABSOLUTE_MIN_QUORUM = 500;
    uint256 public constant BASE_MIN_VOTES_REQUIRED = 5000;
    uint256 public constant BASE_MIN_PARTICIPATION = 10;
    uint64 public emergencyRescueReadyAt; // 0 = not initiated
    bool public emergencyRescueApproved; // DAO-03 FIX: Track secondary approval
    address public emergencyRescueInitiator; // DAO-03 hardening: initiator cannot self-approve
    // F-22 FIX: Emergency timelock replacement for DAO circular dependency recovery
    uint256 public constant EMERGENCY_TIMELOCK_DELAY = 30 days;
    address public pendingEmergencyTimelock;
    uint64  public emergencyTimelockReadyAt;
    bool public emergencyTimelockApproved; // DAO-03 FIX: Track secondary approval for timelock replacement
    address public emergencyTimelockInitiator; // DAO-03 hardening: initiator cannot self-approve
    mapping(address => uint256) public lastVoteRewardDay;
    mapping(address => uint64) public lastProposalAt;
    mapping(ProposalType => mapping(address => bool)) public proposalTypeTargetAllowed;
    mapping(ProposalType => uint256) public proposalTypeTargetPolicyCount;
    mapping(ProposalType => mapping(bytes4 => bool)) public proposalTypeSelectorAllowed;
    mapping(ProposalType => uint256) public proposalTypeSelectorPolicyCount;

    /// @notice H-3 FIX: When true, proposals are fail-closed — types without any configured policy are rejected.
    /// @dev Enabled by default so governance cannot silently run without explicit policy coverage.
    bool public requireProposalPolicies;

    /// @notice DAO-10 FIX: Cap total proposals to prevent unbounded iteration
    uint256 public constant MAX_PROPOSALS = 200;
    /// @notice DAO-12 FIX: Queued proposals expire after 30 days if not executed
    uint256 public constant QUEUE_EXPIRY = 30 days;
    uint256 public constant VOTER_HISTORY_SOFT_CAP = 500;

    struct Proposal {
        address proposer;
        address target;
        uint256 value;
        bytes   data;
        string  description;
        ProposalType proposalType; // L-02: renamed from ptype for clarity (ptype was inconsistent with the type name)
        uint64  createdAt;
        uint64  start;
        uint64  end;
        uint64  queuedAt;     // DAO-12 FIX: Track when proposal was queued for expiry
        bool    executed;
        bool    queued;
        uint256 forVotes;      // Score-weighted
        uint256 againstVotes;  // Score-weighted
        uint256 voterCount;    // FLOW-2 FIX: Track unique voter count
        mapping(address => bool) hasVoted;
        mapping(address => uint256) scoreSnapshot;
    }
    uint256 public proposalCount;
    uint256 public activeProposalCount;
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
    /// @notice DAO-05 FIX: Score must have been established at least 2 days before proposal creation
    /// @dev Prevents last-minute ProofScore pumping just before a proposal is submitted
    uint256 public constant SCORE_SETTLEMENT_WINDOW = 2 days;

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
        requireProposalPolicies = true;
        // NEW-08 hardening: initialize emergency approver at deployment so
        // emergency controls are not dead-on-arrival before a timelock update.
        emergencyApprover = _timelock;
        // H-4 FIX: Bootstrap break-glass admin to the deployer admin so a timelock deadlock
        // can be resolved without the (potentially compromised) timelock.
        breakGlassAdmin = _admin;
        emit ModulesSet(_timelock,_seer,_hub,_hooks,address(0)); emit AdminSet(_admin); emit RequireProposalPoliciesSet(true);
    }

    function setModules(address _timelock, address _seer, address _hub, address _hooks) external onlyTimelock {
        require(_timelock!=address(0)&&_seer!=address(0)&&_hub!=address(0),"zero");
        timelock=IDAOTimelock(_timelock); seer=ISeer(_seer); vaultHub=IVaultHub(_hub); hooks=IGovernanceHooks(_hooks);
        emit ModulesSet(_timelock,_seer,_hub,_hooks,address(councilElection)); // Updated to include councilElection
    }

    /// @notice Set the council election module used for quorum-profile syncing.
    function setCouncilElection(address _councilElection) external onlyTimelock {
        require(_councilElection != address(0), "zero");
        councilElection = ICouncilElection(_councilElection);
        emit CouncilElectionSet(_councilElection);
        emit ModulesSet(address(timelock), address(seer), address(vaultHub), address(hooks), _councilElection);
    }
    
    /// @notice Set the SeerGuardian for mutual DAO/Seer oversight
    function setGuardian(address _guardian) external onlyTimelock {
        require(_guardian != address(0), "zero");
        guardian = ISeerGuardian_DAO(_guardian);
    }

    /// @notice Set SeerAutonomous for proactive pre-action governance enforcement
    function setSeerAutonomous(address _seerAutonomous) external onlyTimelock {
        require(_seerAutonomous != address(0), "zero");
        seerAutonomous = ISeerAutonomous_DAO(_seerAutonomous);
        emit SeerAutonomousSet(_seerAutonomous);
    }

    function setAdmin(address _admin) external onlyTimelock { 
        require(_admin!=address(0),"zero");
        pendingAdmin = _admin;
        emit AdminTransferProposed(_admin);
    }

    function cancelPendingAdmin() external onlyTimelock {
        pendingAdmin = address(0);
        emit AdminTransferCancelled();
    }

    function acceptAdmin() external {
        if (msg.sender != pendingAdmin) revert DAO_NotPendingAdmin();
        admin = msg.sender;
        pendingAdmin = address(0);
        emit AdminSet(msg.sender);
    }
    
    /// @notice DAO-03 FIX: Set emergency approver (secondary check for emergency actions)
    function setEmergencyApprover(address _approver) external onlyTimelock {
        require(_approver != address(0), "zero");
        emergencyApprover = _approver;
    }

    // ── H-4 Break-glass admin rotation (no timelock dependency) ──────────────

    /// @notice Queue a break-glass admin rotation. Only current breakGlassAdmin can call.
    ///         Completes after BREAK_GLASS_DELAY (7 days) without requiring the timelock.
    ///         Intended ONLY to recover from a DAOTimelock deadlock.
    function proposeBreakGlassAdmin(address _newAdmin) external {
        require(msg.sender == breakGlassAdmin, "DAO: not breakGlassAdmin");
        require(_newAdmin != address(0), "zero");
        pendingBreakGlassAdmin = _newAdmin;
        breakGlassAdminReadyAt = uint64(block.timestamp) + BREAK_GLASS_DELAY;
        emit AdminTransferProposed(_newAdmin);
    }

    /// @notice After 7-day delay, apply the break-glass admin rotation.
    function applyBreakGlassAdmin() external {
        require(msg.sender == breakGlassAdmin, "DAO: not breakGlassAdmin");
        require(pendingBreakGlassAdmin != address(0), "DAO: no pending break-glass admin");
        require(block.timestamp >= breakGlassAdminReadyAt, "DAO: break-glass delay active");
        admin = pendingBreakGlassAdmin;
        pendingBreakGlassAdmin = address(0);
        breakGlassAdminReadyAt = 0;
        emit AdminSet(admin);
    }

    /// @notice Update the breakGlassAdmin address itself (requires timelock when timelock is healthy).
    function setBreakGlassAdmin(address _bga) external onlyTimelock {
        require(_bga != address(0), "zero");
        breakGlassAdmin = _bga;
    }
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
        emit MinParticipationSet(_minParticipation); // Emit event for minParticipation
    }

    /// @notice F-56 FIX: Effective participation floor scales with active voter population.
    /// @dev Returns max(configured minimum, 1% of active voters).
    function effectiveMinParticipation() public view returns (uint256) {
        uint256 dynamicFloor = totalActiveVoters / 100;
        return dynamicFloor > minParticipation ? dynamicFloor : minParticipation;
    }

    /// @notice Recommend quorum thresholds for the current governance scale.
    /// @dev Uses council-size bands as a governance participation proxy. Raw user counts are too sybil-prone.
    function recommendedQuorumForCouncilSize(uint256 _councilSize) public pure returns (uint256 recommendedMinVotes, uint256 recommendedMinParticipation) {
        require(_councilSize > 0 && _councilSize <= 21, "DAO: invalid council size");

        if (_councilSize <= 12) {
            return (BASE_MIN_VOTES_REQUIRED, BASE_MIN_PARTICIPATION);
        }

        if (_councilSize <= 15) {
            return (6000, 12);
        }

        if (_councilSize <= 18) {
            return (7000, 14);
        }

        return (8000, 16);
    }

    /// @notice Sync quorum thresholds to the active council size.
    /// @dev Timelock-controlled so governance explicitly accepts each profile change.
    function syncQuorumToCouncil() external onlyTimelock {
        require(address(councilElection) != address(0), "DAO: council not set");
        uint256 size = councilElection.getActualCouncilSize();
        (uint256 recommendedMinVotes, uint256 recommendedMinParticipation) = recommendedQuorumForCouncilSize(size);

        minVotesRequired = recommendedMinVotes;
        minParticipation = recommendedMinParticipation;

        emit ParamsSet(votingPeriod, recommendedMinVotes);
        emit MinParticipationSet(recommendedMinParticipation);
        emit QuorumProfileSynced(size, recommendedMinVotes, recommendedMinParticipation);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //             EMERGENCY QUORUM RESCUE (governance deadlock breaker)
    // ═══════════════════════════════════════════════════════════════════════

    /// @notice Initiate emergency quorum rescue — 14-day warmup before execution
    /// @dev DAO-03 FIX: Requires approval from both admin and emergencyApprover to prevent sole-admin bypass
    function initiateEmergencyQuorumRescue() external {
        require(msg.sender == admin || msg.sender == emergencyApprover, "DAO: not authorized");
        require(emergencyApprover != address(0), "DAO: emergency approver not set");
        require(emergencyRescueReadyAt == 0, "DAO: rescue already pending");
        
        emergencyRescueReadyAt = uint64(block.timestamp + EMERGENCY_RESCUE_DELAY);
        emergencyRescueApproved = false; // Reset approval flag
        emergencyRescueInitiator = msg.sender;
        emit EmergencyQuorumRescueInitiated(emergencyRescueReadyAt);
    }
    
    /// @notice Approve emergency quorum rescue (secondary sign-off)
    /// @dev DAO-03 FIX: Must be called by the other party (admin or emergencyApprover)
    function approveEmergencyQuorumRescue() external {
        require(emergencyRescueReadyAt != 0, "DAO: no rescue pending");
        require(emergencyApprover != address(0), "DAO: emergency approver not set");
        require(msg.sender == admin || msg.sender == emergencyApprover, "DAO: not authorized");
        require(emergencyRescueInitiator != address(0), "DAO: no initiator");
        require(msg.sender != emergencyRescueInitiator, "DAO: initiator cannot self-approve");

        emergencyRescueApproved = true;
        emit EmergencyQuorumRescueApproved();
    }

    /// @notice Cancel a pending emergency quorum rescue
    /// @dev DAO-03 FIX: Can be called by admin or emergencyApprover to prevent unwanted execution
    function cancelEmergencyQuorumRescue() external {
        require(msg.sender == admin || msg.sender == emergencyApprover, "DAO: not authorized");
        require(emergencyRescueReadyAt != 0, "DAO: no rescue pending");
        emergencyRescueReadyAt = 0;
        emergencyRescueApproved = false; // Reset approval flag when cancelled
        emergencyRescueInitiator = address(0);
        emit EmergencyQuorumRescueCancelled();
    }

    /// @notice Execute emergency quorum rescue after warmup period
    /// @dev Can only REDUCE quorum parameters. Bounded by same minimums as setParams/setMinParticipation.
    /// @param _minVotes New minVotesRequired (must be < current, >= ABSOLUTE_MIN_QUORUM)
    /// @param _minParticipation New minParticipation (must be <= current, >= 3)
    function executeEmergencyQuorumRescue(uint256 _minVotes, uint256 _minParticipation) external onlyAdmin {
        require(emergencyRescueReadyAt != 0, "DAO: no rescue pending");
        require(emergencyApprover != address(0), "DAO: emergency approver not set");
        require(block.timestamp >= emergencyRescueReadyAt, "DAO: rescue warmup not elapsed");
        require(emergencyRescueApproved, "DAO: secondary approval required"); // DAO-03 FIX: Require approval from emergencyApprover
        // F-21 FIX: New quorum must be >= 10% of the current value to prevent essentially zeroing quorum
        require(_minVotes >= minVotesRequired / 10, "DAO: quorum too low (must be >= 10% of current)");
        require(_minVotes >= ABSOLUTE_MIN_QUORUM, "DAO: below absolute minimum quorum");
        require(_minVotes < minVotesRequired, "DAO: must reduce minVotes");
        require(_minParticipation >= 3, "DAO: min participation too low");
        require(_minParticipation <= minParticipation, "DAO: must reduce or keep minParticipation");
        
        emergencyRescueReadyAt = 0;
        emergencyRescueApproved = false; // Reset flag after execution
        emergencyRescueInitiator = address(0);
        minVotesRequired = _minVotes;
        minParticipation = _minParticipation;
        emit EmergencyQuorumRescueExecuted(_minVotes, _minParticipation);
    }

    /// @notice F-22 FIX: Propose a new timelock address for emergency replacement (30-day delay)
    /// @dev Required when the timelock contract has a bug or key compromise and DAO cannot govern itself.
    /// @dev DAO-03 FIX: Requires approval from both admin and emergencyApprover
    function proposeEmergencyTimelockReplacement(address newTimelock) external {
        require(msg.sender == admin || msg.sender == emergencyApprover, "DAO: not authorized");
        require(emergencyApprover != address(0), "DAO: emergency approver not set");
        require(newTimelock != address(0), "DAO: zero");
        pendingEmergencyTimelock = newTimelock;
        emergencyTimelockReadyAt = uint64(block.timestamp) + uint64(EMERGENCY_TIMELOCK_DELAY);
        emergencyTimelockApproved = false; // Reset approval flag
        emergencyTimelockInitiator = msg.sender;
        emit EmergencyTimelockReplacementProposed(newTimelock, emergencyTimelockReadyAt);
    }
    
    /// @notice Approve emergency timelock replacement (secondary sign-off)
    /// @dev DAO-03 FIX: Must be called by the other party (admin or emergencyApprover)
    function approveEmergencyTimelockReplacement() external {
        require(pendingEmergencyTimelock != address(0), "DAO: no pending replacement");
        require(emergencyApprover != address(0), "DAO: emergency approver not set");
        require(msg.sender == admin || msg.sender == emergencyApprover, "DAO: not authorized");
        require(emergencyTimelockInitiator != address(0), "DAO: no initiator");
        require(msg.sender != emergencyTimelockInitiator, "DAO: initiator cannot self-approve");

        emergencyTimelockApproved = true;
        emit EmergencyTimelockReplacementApproved();
    }

    /// @notice F-22 FIX: Execute emergency timelock replacement after 30-day delay
    /// @dev DAO-03 FIX: Requires secondary approval from emergencyApprover
    function executeEmergencyTimelockReplacement() external {
        require(msg.sender == admin || msg.sender == emergencyApprover, "DAO: not authorized");
        require(emergencyApprover != address(0), "DAO: emergency approver not set");
        require(emergencyTimelockReadyAt > 0 && block.timestamp >= emergencyTimelockReadyAt, "DAO: not ready");
        require(emergencyTimelockApproved, "DAO: secondary approval required"); // DAO-03 FIX
        address newTimelock = pendingEmergencyTimelock;
        timelock = IDAOTimelock(newTimelock);
        delete pendingEmergencyTimelock;
        delete emergencyTimelockReadyAt;
        emergencyTimelockApproved = false; // Reset flag after execution
        emergencyTimelockInitiator = address(0);
        emit EmergencyTimelockReplacementExecuted(newTimelock);
    }

    /// @notice F-22 FIX: Cancel a pending emergency timelock replacement
    /// @dev DAO-03 FIX: Can be called by admin or emergencyApprover to prevent unwanted execution
    function cancelEmergencyTimelockReplacement() external {
        require(msg.sender == admin || msg.sender == emergencyApprover, "DAO: not authorized");
        require(pendingEmergencyTimelock != address(0), "DAO: no pending replacement");
        delete pendingEmergencyTimelock;
        delete emergencyTimelockReadyAt;
        emergencyTimelockApproved = false; // Reset approval flag
        emergencyTimelockInitiator = address(0);
        emit EmergencyTimelockReplacementCancelled();
    }

    /// @notice Set minimum spacing between proposals by the same proposer
    function setProposalCooldown(uint64 _cooldown) external onlyTimelock {
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

    /// @notice Configure allowlist policy for proposal type function selectors.
    /// @dev bytes4(0) is valid and explicitly represents short calldata / fallback-style proposals.
    function setProposalTypeSelectorPolicy(ProposalType ptype, bytes4 selector, bool allowed) external onlyTimelock {
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

    /// @notice H-3 FIX: Set fail-closed mode for proposal policies.
    /// @dev When true, any proposal type that has no configured target or selector policy is rejected.
    ///      Enable only after all required policies have been configured via governance.
    function setRequireProposalPolicies(bool required) external onlyTimelock {
        requireProposalPolicies = required;
        emit RequireProposalPoliciesSet(required);
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
        uint64 scoreTimestamp = block.timestamp > SCORE_SETTLEMENT_WINDOW
            ? uint64(block.timestamp - SCORE_SETTLEMENT_WINDOW)
            : uint64(block.timestamp);
        return seer.getScoreAt(a, scoreTimestamp) >= seer.minForGovernance();
    }

    function _canPruneVoterHistoryEntry(uint256 proposalId) internal view returns (bool) {
        Proposal storage proposal = proposals[proposalId];
        if (proposal.start == 0 && proposal.end == 0) {
            return true;
        }

        if (proposal.executed) {
            return true;
        }

        if (proposal.end > 0 && block.timestamp >= proposal.end) {
            return true;
        }

        return false;
    }

    function _pruneVoterHistory(address voter, uint256 maxRemovals) internal returns (uint256 removed) {
        uint256[] storage all = voterProposals[voter];
        uint256 writeIndex = 0;

        for (uint256 readIndex = 0; readIndex < all.length; readIndex++) {
            uint256 proposalId = all[readIndex];
            bool shouldPrune = removed < maxRemovals && _canPruneVoterHistoryEntry(proposalId);
            if (shouldPrune) {
                removed++;
                continue;
            }

            all[writeIndex] = proposalId;
            writeIndex++;
        }

        while (all.length > writeIndex) {
            all.pop();
        }
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
        // H-3 FIX: When requireProposalPolicies is true, the check is fail-closed:
        // proposal types with NO configured policy are rejected outright to prevent
        // unintended governance actions on unconfigured target/selector combinations.
        if (requireProposalPolicies && proposalTypeTargetPolicyCount[ptype] == 0) {
            revert DAO_ProposalTargetNotAllowed(uint8(ptype), target);
        }
        if (target != address(0) && proposalTypeTargetPolicyCount[ptype] > 0 && !proposalTypeTargetAllowed[ptype][target]) {
            revert DAO_ProposalTargetNotAllowed(uint8(ptype), target);
        }
        if (requireProposalPolicies && proposalTypeSelectorPolicyCount[ptype] == 0) {
            bytes4 sel = _selector(data);
            revert DAO_ProposalSelectorNotAllowed(uint8(ptype), sel);
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
        
        // Cap concurrently active proposals instead of the historical ID counter so
        // withdrawn/finalized proposals cannot permanently brick governance capacity.
        require(activeProposalCount < MAX_PROPOSALS, "DAO: proposal cap reached");
        id=++proposalCount;
        activeProposalCount += 1;
        Proposal storage p=proposals[id];
        p.proposer=msg.sender; p.proposalType=ptype; p.target=target; p.value=value; p.data=data; p.description=description;
        p.createdAt = uint64(block.timestamp);
        // Flash loan protection: voting starts after votingDelay
        p.start=uint64(block.timestamp) + votingDelay; p.end=p.start+votingPeriod;
        emit ProposalCreated(id,msg.sender,ptype,target,value,data,description);
        
        // Auto-check proposer via SeerGuardian (may flag for extra scrutiny)
        if (address(guardian) != address(0)) {
            try guardian.autoCheckProposer(id, msg.sender) {} catch {}
        }

        _enforceSeerAction(msg.sender, 4, value, target); // GovernancePropose
    }

    // slither-disable-next-line reentrancy-benign
    function vote(uint256 id, bool support) external nonReentrant {
        address voter = msg.sender;
        Proposal storage p = proposals[id];
        // FLOW-1 FIX: Check both start and end are set (proposal exists and wasn't deleted)
        if (p.end == 0 || p.start == 0) revert DAO_UnknownProposal();
        if (block.timestamp < p.start) revert DAO_VoteNotStarted(); // Flash loan protection
        if (block.timestamp >= p.end) revert DAO_VoteEnded();
        // Anti-front-running: reject votes in the final grace period
        require(block.timestamp < p.end - VOTE_GRACE_PERIOD, "DAO: vote submission closed");
        if (!_eligible(voter)) revert DAO_NotEligible();
        if (p.hasVoted[voter]) revert DAO_AlreadyVoted();
        
        require(!p.executed && !p.queued, "DAO: proposal already processed");
        
        p.hasVoted[voter] = true;
        p.voterCount++; // FLOW-2 FIX: Track unique voter count

        if (!hasVotedAnyProposal[voter]) {
            hasVotedAnyProposal[voter] = true;
            totalActiveVoters += 1;
        }
        
        // Track voter history (I-11: capped to prevent unbounded storage growth)
        if (voterProposals[voter].length >= VOTER_HISTORY_SOFT_CAP) {
            _pruneVoterHistory(voter, VOTER_HISTORY_SOFT_CAP);
        }
        require(voterProposals[voter].length < VOTER_HISTORY_SOFT_CAP, "DAO: voter history full");
        voterProposals[voter].push(id);
        
        uint256 rawSnapshot = p.scoreSnapshot[voter];
        uint256 weight;
        if (rawSnapshot == 0) {
            // F-28 FIX: Require voter's score to have been established before the proposal was created.
            // DAO-04 FIX: Also require activity within 90 days (not stale > 90 days).
            // DAO-05 FIX: Freeze vote weight at proposal creation time instead of first-vote time.
            uint64 voterLastActivity = seer.lastActivity(voter);
            uint64 scoreDeadline = p.createdAt;
            require(
                voterLastActivity > 0 &&
                voterLastActivity + SCORE_SETTLEMENT_WINDOW <= scoreDeadline &&
                voterLastActivity > block.timestamp - 90 days,
                "DAO: score not recently established"
            );

            weight = uint256(seer.getScoreAt(voter, scoreDeadline));
            // M-23 NOTE: Solidity 0.8 checked arithmetic guarantees `weight + 1` reverts on overflow.
            uint256 encodedSnapshot = weight + 1;
            p.scoreSnapshot[voter] = encodedSnapshot; // +1 so score-0 is stored as 1, not confused with unset
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
        bool qmet = total >= minVotesRequired && p.voterCount >= effectiveMinParticipation(); 
        bool passed = qmet && p.forVotes > p.againstVotes;

        if (activeProposalCount > 0) {
            activeProposalCount -= 1;
        }

        emit Finalized(id,passed);
        if (passed){
            p.queued=true;
            p.queuedAt=uint64(block.timestamp); // DAO-12 FIX: Record queue time for expiry
            bytes32 tlId = timelock.queueTxFromDAO(p.target,p.value,p.data,id);
            emit Queued(id,tlId);
            if (address(hooks)!=address(0)) { try hooks.onProposalQueued(id,p.target,p.value) {} catch {} }
        }
        if (address(hooks)!=address(0)) { try hooks.onFinalized(id,passed) {} catch {} }
    }

    /// @notice DAO-07 FIX: Only timelock can mark proposals executed (prevents admin soft veto)
    function markExecuted(uint256 id) external {
        require(msg.sender == address(timelock), "DAO: only timelock can mark executed");
        Proposal storage p=proposals[id];
        require(p.queued&&!p.executed,"bad");
        // DAO-12 FIX: Prevent execution of expired queued proposals
        require(block.timestamp < uint256(p.queuedAt) + QUEUE_EXPIRY, "DAO: queued proposal expired");
        p.executed=true; emit Executed(id);
    }

    /// @notice DAO-12 FIX: Expire stale queued proposals that were never executed
    /// @dev Anyone can call — this reclaims proposal slot when timelock fails to execute
    function expireQueuedProposal(uint256 id) external {
        Proposal storage p = proposals[id];
        require(p.queued && !p.executed, "DAO: not queued or already executed");
        require(p.queuedAt > 0, "DAO: no queue timestamp");
        require(block.timestamp >= uint256(p.queuedAt) + QUEUE_EXPIRY, "DAO: expiry not reached");
        p.queued = false;
        emit ProposalStateChanged(id, "queued", "expired");
    }

    function withdrawProposal(uint256 id) external {
        Proposal storage p = proposals[id];
        require(p.proposer == msg.sender, "Not proposer");
        require(!p.executed && !p.queued, "Already processed");
        
        // DAO-08 FIX: Cannot withdraw once voting has started, regardless of vote count.
        // This prevents gaming by submitting proposals before withdrawing to avoid scrutiny.
        require(block.timestamp < p.start, "DAO: voting has started");
        
        // Must match the proposer-scoped hash used in propose()
        bytes32 proposalHash = keccak256(abi.encode(msg.sender, p.target, p.value, p.data));
        withdrawnProposalHashes[proposalHash] = uint64(block.timestamp);

        if (activeProposalCount > 0) {
            activeProposalCount -= 1;
        }

        // Reset scalar fields instead of deleting the struct, which contains mappings.
        p.proposer = address(0);
        p.target = address(0);
        p.value = 0;
        p.data = "";
        p.description = "";
        p.proposalType = ProposalType.Generic;
        p.createdAt = 0;
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
        // DAO-09 FIX: Require minimum ProofScore to prevent spam dispute flooding
        // Only users with governance eligibility (same threshold as proposing) may file disputes
        require(_eligible(msg.sender), "DAO: insufficient ProofScore to dispute");
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
        quorumMet = total >= minVotesRequired && p.voterCount >= effectiveMinParticipation();
        passing = quorumMet && p.forVotes > p.againstVotes;
        timeRemaining = block.timestamp < p.end ? p.end - block.timestamp : 0;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                        VOTER HISTORY TRACKING
    // ═══════════════════════════════════════════════════════════════════════
    
    // Track proposals voted on by each voter
    mapping(address => uint256[]) private voterProposals;
    mapping(address => bool) public hasVotedAnyProposal;
    uint256 public totalActiveVoters;
    
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

    function pruneVoterHistory(uint256 maxRemovals) external returns (uint256 removed) {
        uint256 removals = maxRemovals == 0 ? VOTER_HISTORY_SOFT_CAP : maxRemovals;
        removed = _pruneVoterHistory(msg.sender, removals);
        emit VoterHistoryPruned(msg.sender, removed);
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