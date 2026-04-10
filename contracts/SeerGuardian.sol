// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./SharedInterfaces.sol";

/**
 * @title SeerGuardian
 * @notice Automatic enforcement system with mutual DAO/Seer checks
 * 
 * The Seer acts as guardian/policeman - automatic enforcement with DAO override capability.
 * Mutual checks:
 * - DAO can override Seer decisions via proposal
 * - Seer can flag/delay suspicious DAO proposals
 * 
 * Automatic triggers:
 * - Score drops below threshold → restrictions applied automatically
 * - Suspicious patterns detected → flagged for review
 * - Repeated violations → escalating penalties
 * 
 * All automatic actions can be overridden by DAO vote.
 */

/// ═══════════════════════════════════════════════════════════════════════════
///                              INTERFACES
/// ═══════════════════════════════════════════════════════════════════════════

interface ISeer_Guardian {
    function getScore(address) external view returns (uint16);
    function punish(address subject, uint16 delta, string calldata reason) external;
    function reward(address subject, uint16 delta, string calldata reason) external;
    function lowTrustThreshold() external view returns (uint16);
    function highTrustThreshold() external view returns (uint16);
    function minForGovernance() external view returns (uint16);
}

interface IDAO_Guardian {
    function admin() external view returns (address);
    function proposalCount() external view returns (uint256);
    function getProposalDetails(uint256 id) external view returns (
        address proposer,
        uint8 ptype,
        address target,
        uint256 value,
        string memory description,
        uint64 startTime,
        uint64 endTime,
        uint256 forVotes,
        uint256 againstVotes,
        bool executed,
        bool queued
    );
}

interface IProofLedger_Guardian {
    function logSystemEvent(address who, string calldata action, address by) external;
}

interface IVaultHub_Guardian {
    function vaultOf(address owner) external view returns (address);
}

/// ═══════════════════════════════════════════════════════════════════════════
///                                ERRORS
/// ═══════════════════════════════════════════════════════════════════════════

error SG_NotAuthorized();
error SG_Zero();
error SG_Cooldown();
error SG_AlreadyOverridden();
error SG_NoViolation();
error SG_InvalidAction();

/// ═══════════════════════════════════════════════════════════════════════════
///                           SEER GUARDIAN
/// ═══════════════════════════════════════════════════════════════════════════

contract SeerGuardian is ReentrancyGuard {
    uint16 private constant RC_AUTO_LOW_SCORE = 300;
    uint16 private constant RC_AUTO_VERY_LOW_SCORE = 301;
    uint16 private constant RC_AUTO_CRITICAL_SCORE = 302;
    uint16 private constant RC_AUTO_SCORE_RECOVERED = 303;
    uint16 private constant RC_PROPOSER_NEAR_THRESHOLD = 400;
    uint16 private constant RC_PROPOSER_HAS_VIOLATIONS = 401;
    uint16 private constant RC_MANUAL_PROPOSAL_FLAG = 450;
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              EVENTS
    // ═══════════════════════════════════════════════════════════════════════
    
    event ModulesSet(address seer, address dao, address vaultHub, address ledger);
    event DAOSet(address indexed oldDAO, address indexed newDAO);
    
    // Automatic enforcement events
    event AutoRestrictionApplied(address indexed subject, RestrictionType rtype, string reason);
    event AutoRestrictionAppliedCode(address indexed subject, RestrictionType rtype, uint16 indexed reasonCode, string reason);
    event AutoRestrictionLifted(address indexed subject, RestrictionType rtype, string reason);
    event ViolationRecorded(address indexed subject, ViolationType vtype, uint8 count);
    event PenaltyApplied(address indexed subject, uint16 scorePenalty, string reason);
    event PenaltyAppliedCode(address indexed subject, uint16 scorePenalty, uint16 indexed reasonCode, string reason);
    
    // Override events  
    event DAOOverride(address indexed subject, bytes32 indexed actionId, string reason);
    event SeerFlag(uint256 indexed proposalId, string reason, uint64 delayUntil);
    event SeerFlagCleared(uint256 indexed proposalId, address clearedBy);
    
    // Mutual check events
    event DAOActionFlagged(uint256 indexed proposalId, string concern);
    event DAOActionFlaggedCode(uint256 indexed proposalId, uint16 indexed reasonCode, string concern);
    event SeerActionOverridden(bytes32 indexed actionId, string resolution);
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              TYPES
    // ═══════════════════════════════════════════════════════════════════════
    
    enum RestrictionType {
        None,
        TransferLimit,      // Can only transfer small amounts
        GovernanceBan,      // Cannot vote/propose
        MerchantSuspended,  // Removed from merchant listings
        FullFreeze          // All activity frozen pending DAO review
    }
    
    enum ViolationType {
        None,
        SuspiciousTransfer,   // Unusual transfer patterns
        RapidScoreDrop,       // Score dropped quickly
        SpamActivity,         // Repeated failed actions
        FailedRecovery,       // Multiple failed recovery attempts
        GovernanceAbuse       // Voting manipulation attempts
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              STATE
    // ═══════════════════════════════════════════════════════════════════════
    
    address public dao;
    ISeer_Guardian public seer;
    IVaultHub_Guardian public vaultHub;
    IProofLedger_Guardian public ledger;
    
    // Automatic restriction tracking
    mapping(address => RestrictionType) public activeRestriction;
    mapping(address => uint64) public restrictionExpiry;
    mapping(address => bool) public daoOverridden;  // DAO has overridden automatic action
    
    // Violation tracking for escalating penalties
    mapping(address => uint64) public lastEnforceCheck;
    mapping(address => mapping(ViolationType => uint8)) public violationCount;
    mapping(address => uint64) public lastViolationTime;
    
    // Seer flags on DAO proposals
    mapping(uint256 => bool) public proposalFlagged;
    mapping(uint256 => uint64) public proposalDelayUntil;
    mapping(uint256 => string) public proposalFlagReason;
    
    // DAO override of Seer actions
    mapping(bytes32 => bool) public actionOverridden;
    
    // Configuration (DAO-tunable)
    uint16 public autoRestrictThreshold = 3000;   // Score below 30% triggers auto-restrict
    uint16 public autoLiftThreshold = 4500;       // Score above 45% lifts restriction
    uint64 public violationCooldown = 1 hours;    // Minimum time between violations
    uint64 public maxRestrictionDuration = 30 days;
    uint64 public proposalFlagDelay = 2 days;     // Extra delay for flagged proposals
    
    // Escalating penalties
    uint16[5] public penaltyScale = [50, 100, 200, 400, 800]; // Increasing penalties
    uint64[5] public restrictionDurations = [1 days, 3 days, 7 days, 14 days, 30 days];
    
    // ═══════════════════════════════════════════════════════════════════════
    //                            MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════
    
    modifier onlyDAO() {
        if (msg.sender != dao) revert SG_NotAuthorized();
        _;
    }
    
    modifier onlyAuthorized() {
        // DAO or Seer-related contracts can trigger
        if (msg.sender != dao && msg.sender != address(seer)) revert SG_NotAuthorized();
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                          CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════
    
    constructor(address _dao, address _seer, address _vaultHub, address _ledger) {
        if (_dao == address(0) || _seer == address(0)) revert SG_Zero();
        dao = _dao;
        seer = ISeer_Guardian(_seer);
        if (_vaultHub != address(0)) vaultHub = IVaultHub_Guardian(_vaultHub);
        if (_ledger != address(0)) ledger = IProofLedger_Guardian(_ledger);
        emit ModulesSet(_seer, _dao, _vaultHub, _ledger);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                      DAO CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════
    
    function setModules(address _seer, address _vaultHub, address _ledger) external onlyDAO nonReentrant {
        if (_seer == address(0)) revert SG_Zero();
        seer = ISeer_Guardian(_seer);
        if (_vaultHub != address(0)) vaultHub = IVaultHub_Guardian(_vaultHub);
        if (_ledger != address(0)) ledger = IProofLedger_Guardian(_ledger);
        emit ModulesSet(_seer, dao, _vaultHub, _ledger);
    }
    
    function setDAO(address _newDAO) external onlyDAO nonReentrant {
        if (_newDAO == address(0)) revert SG_Zero();
        address old = dao;
        dao = _newDAO;
        emit DAOSet(old, _newDAO);
    }
    
    function setThresholds(
        uint16 _autoRestrict,
        uint16 _autoLift,
        uint64 _violationCooldown,
        uint64 _maxDuration,
        uint64 _flagDelay
    ) external onlyDAO nonReentrant {
        require(_autoRestrict < _autoLift, "SG: invalid thresholds");
        autoRestrictThreshold = _autoRestrict;
        autoLiftThreshold = _autoLift;
        violationCooldown = _violationCooldown;
        maxRestrictionDuration = _maxDuration;
        proposalFlagDelay = _flagDelay;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                    AUTOMATIC ENFORCEMENT (Guardian Role)
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Check and auto-enforce restrictions based on current score
     * @dev Anyone can call this to trigger automatic enforcement
     * @param subject The address to check
     */
    function checkAndEnforce(address subject) external nonReentrant {
        if (daoOverridden[subject]) return; // DAO has overridden, skip auto-enforcement
        require(block.timestamp >= lastEnforceCheck[subject] + 1 hours, "SG: cooldown");
        lastEnforceCheck[subject] = uint64(block.timestamp);
        
        uint16 score = seer.getScore(subject);
        RestrictionType currentRestriction = activeRestriction[subject];
        
        // SG-01 FIX: Check most-severe conditions first so a single call applies the
        // harshest applicable restriction immediately (no multi-call escalation needed).
        // Critical: full freeze for dangerous scores (< 1000 — highest priority)
        if (score < 1000 && currentRestriction < RestrictionType.FullFreeze) {
            _applyAutoRestriction(subject, RestrictionType.FullFreeze, "auto_critical_score", RC_AUTO_CRITICAL_SCORE);
        }
        // More severe restriction for very low scores (< 2000) — only if not already FullFreeze
        else if (score < 2000 && currentRestriction < RestrictionType.TransferLimit) {
            _applyAutoRestriction(subject, RestrictionType.TransferLimit, "auto_very_low_score", RC_AUTO_VERY_LOW_SCORE);
        }
        // Base governance ban for generally low scores
        else if (score < autoRestrictThreshold && currentRestriction == RestrictionType.None) {
            _applyAutoRestriction(subject, RestrictionType.GovernanceBan, "auto_low_score", RC_AUTO_LOW_SCORE);
        }
        
        // Auto-lift if score recovered
        if (score >= autoLiftThreshold && currentRestriction != RestrictionType.None) {
            // Only lift if restriction has expired or score is high enough
            if (block.timestamp >= restrictionExpiry[subject] || score >= seer.highTrustThreshold()) {
                _liftRestriction(subject, "auto_score_recovered");
            }
        }
    }
    
    /**
     * @notice Record a violation and apply escalating penalties
     * @param subject The violator
     * @param vtype Type of violation
     * @param reason Description
     */
    function recordViolation(address subject, ViolationType vtype, string calldata reason) external onlyAuthorized nonReentrant {
        if (block.timestamp < lastViolationTime[subject] + violationCooldown) revert SG_Cooldown();
        if (vtype == ViolationType.None) revert SG_InvalidAction();
        
        // Increment violation count
        uint8 count = violationCount[subject][vtype];
        if (count < 255) {
            violationCount[subject][vtype] = count + 1;
            count++;
        }
        lastViolationTime[subject] = uint64(block.timestamp);
        
        emit ViolationRecorded(subject, vtype, count);
        
        // Apply escalating penalty
        uint8 penaltyIndex = count > 5 ? 4 : count - 1;
        uint16 penalty = penaltyScale[penaltyIndex];
        
        // Auto-punish via Seer
        try seer.punish(subject, penalty, reason) {
            emit PenaltyApplied(subject, penalty, reason);
            emit PenaltyAppliedCode(subject, penalty, _violationReasonCode(vtype), reason);
        } catch {}
        
        // Apply time-based restriction for repeat offenders
        if (count >= 3) {
            RestrictionType rtype = count >= 5 ? RestrictionType.FullFreeze : RestrictionType.GovernanceBan;
            uint64 duration = restrictionDurations[penaltyIndex];
            restrictionExpiry[subject] = uint64(block.timestamp) + duration;
            _applyAutoRestriction(subject, rtype, reason, _violationReasonCode(vtype));
        }
        
        _log("violation_recorded");
    }
    
    function _applyAutoRestriction(address subject, RestrictionType rtype, string memory reason, uint16 reasonCode) internal {
        activeRestriction[subject] = rtype;
        if (restrictionExpiry[subject] < 1) {
            restrictionExpiry[subject] = uint64(block.timestamp) + maxRestrictionDuration;
        }
        emit AutoRestrictionApplied(subject, rtype, reason);
        emit AutoRestrictionAppliedCode(subject, rtype, reasonCode, reason);
        _log("auto_restriction_applied");
    }
    
    function _liftRestriction(address subject, string memory reason) internal {
        activeRestriction[subject] = RestrictionType.None;
        restrictionExpiry[subject] = 0;
        daoOverridden[subject] = false;
        emit AutoRestrictionLifted(subject, RestrictionType.None, reason);
        _log("restriction_lifted");
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                    DAO OVERSIGHT OF SEER (DAO keeps Seer in check)
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice DAO overrides Seer's automatic restriction
     * @param subject The restricted address
     * @param reason Justification for override
     */
    function daoOverrideRestriction(address subject, string calldata reason) external onlyDAO nonReentrant {
        if (activeRestriction[subject] == RestrictionType.None) revert SG_NoViolation();
        
        bytes32 actionId = keccak256(abi.encode(subject, activeRestriction[subject], block.timestamp));
        
        // Lift the restriction
        _liftRestriction(subject, reason);
        
        // Mark as DAO overridden so auto-enforcement won't re-trigger immediately
        daoOverridden[subject] = true;
        
        emit DAOOverride(subject, actionId, reason);
        emit SeerActionOverridden(actionId, reason);
        _log("dao_override_seer");
    }
    
    /**
     * @notice DAO adjusts a user's score, overriding Seer's assessment
     * @param subject The address
     * @param newDelta Score change (+/- from current)
     * @param isPositive True for reward, false for punish
     * @param reason Justification
     */
    function daoAdjustScore(address subject, uint16 newDelta, bool isPositive, string calldata reason) external onlyDAO nonReentrant {
        bytes32 actionId = keccak256(abi.encode("score_adjust", subject, newDelta, block.timestamp));
        
        if (isPositive) {
            try seer.reward(subject, newDelta, reason) {} catch {}
        } else {
            try seer.punish(subject, newDelta, reason) {} catch {}
        }
        
        actionOverridden[actionId] = true;
        emit SeerActionOverridden(actionId, reason);
        _log("dao_adjust_score");
    }
    
    /**
     * @notice DAO clears violation history for rehabilitation
     * @param subject The address to rehabilitate
     */
    function daoRehabilitateUser(address subject) external onlyDAO nonReentrant {
        // Clear all violation types
        violationCount[subject][ViolationType.SuspiciousTransfer] = 0;
        violationCount[subject][ViolationType.RapidScoreDrop] = 0;
        violationCount[subject][ViolationType.SpamActivity] = 0;
        violationCount[subject][ViolationType.FailedRecovery] = 0;
        violationCount[subject][ViolationType.GovernanceAbuse] = 0;
        
        // Lift any restrictions
        if (activeRestriction[subject] != RestrictionType.None) {
            _liftRestriction(subject, "dao_rehabilitation");
        }
        
        daoOverridden[subject] = true;
        _log("dao_rehabilitation");
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                    SEER OVERSIGHT OF DAO (Seer keeps DAO in check)
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Seer flags a suspicious DAO proposal for additional review
     * @dev This adds a delay before the proposal can execute
     * @param proposalId The DAO proposal ID
     * @param concern The security/trust concern
     */
    function seerFlagProposal(uint256 proposalId, string calldata concern) external onlyAuthorized nonReentrant {
        require(!proposalFlagged[proposalId], "SG: already flagged");
        
        proposalFlagged[proposalId] = true;
        proposalDelayUntil[proposalId] = uint64(block.timestamp) + proposalFlagDelay;
        proposalFlagReason[proposalId] = concern;
        
        emit SeerFlag(proposalId, concern, proposalDelayUntil[proposalId]);
        emit DAOActionFlagged(proposalId, concern);
        emit DAOActionFlaggedCode(proposalId, RC_MANUAL_PROPOSAL_FLAG, concern);
        _log("seer_flag_proposal");
    }
    
    /**
     * @notice Check if a proposal is blocked by Seer flag
     * @param proposalId The proposal to check
     * @return blocked True if still under Seer review delay
     * @return reason The flag reason if blocked
     */
    function isProposalBlocked(uint256 proposalId) external view returns (bool blocked, string memory reason) {
        if (!proposalFlagged[proposalId]) {
            return (false, "");
        }
        if (block.timestamp >= proposalDelayUntil[proposalId]) {
            return (false, ""); // Delay has passed
        }
        return (true, proposalFlagReason[proposalId]);
    }
    
    /**
     * @notice DAO clears a Seer flag (override Seer's concern)
     * @param proposalId The flagged proposal
     */
    function daoClearFlag(uint256 proposalId) external onlyDAO nonReentrant {
        require(proposalFlagged[proposalId], "SG: not flagged");
        
        proposalFlagged[proposalId] = false;
        proposalDelayUntil[proposalId] = 0;
        
        emit SeerFlagCleared(proposalId, msg.sender);
        _log("dao_clear_seer_flag");
    }
    
    /**
     * @notice Automatically flag proposals from low-score proposers
     * @param proposalId The proposal ID
     * @param proposer The proposer address
     */
    function autoCheckProposer(uint256 proposalId, address proposer) external onlyAuthorized nonReentrant {
        IDAO_Guardian daoRef = IDAO_Guardian(dao);
        require(proposalId > 0 && proposalId <= daoRef.proposalCount(), "SG: invalid proposal");

        (address recordedProposer,,,,,,,,,,) = daoRef.getProposalDetails(proposalId);
        require(recordedProposer == proposer, "SG: proposer mismatch");

        uint16 score = seer.getScore(proposer);
        
        // Flag proposals from low-trust users
        if (score < seer.minForGovernance() + 1000) {
            // Score is barely above governance threshold - flag for extra scrutiny
            if (!proposalFlagged[proposalId]) {
                proposalFlagged[proposalId] = true;
                proposalDelayUntil[proposalId] = uint64(block.timestamp) + (proposalFlagDelay / 2);
                proposalFlagReason[proposalId] = "Auto: proposer near governance threshold";
                emit SeerFlag(proposalId, "Auto: proposer near threshold", proposalDelayUntil[proposalId]);
                emit DAOActionFlaggedCode(proposalId, RC_PROPOSER_NEAR_THRESHOLD, "Auto: proposer near threshold");
            }
        }
        
        // Check for governance abuse violations
        if (violationCount[proposer][ViolationType.GovernanceAbuse] > 0) {
            if (!proposalFlagged[proposalId]) {
                proposalFlagged[proposalId] = true;
                proposalDelayUntil[proposalId] = uint64(block.timestamp) + proposalFlagDelay;
                proposalFlagReason[proposalId] = "Auto: proposer has governance violations";
                emit SeerFlag(proposalId, "Auto: proposer has violations", proposalDelayUntil[proposalId]);
                emit DAOActionFlaggedCode(proposalId, RC_PROPOSER_HAS_VIOLATIONS, "Auto: proposer has violations");
            }
        }
    }

    function _violationReasonCode(ViolationType vtype) internal pure returns (uint16) {
        if (vtype == ViolationType.SuspiciousTransfer) return 320;
        if (vtype == ViolationType.RapidScoreDrop) return 321;
        if (vtype == ViolationType.SpamActivity) return 322;
        if (vtype == ViolationType.FailedRecovery) return 323;
        if (vtype == ViolationType.GovernanceAbuse) return 324;
        return 0;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                         VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Check if an address has active restrictions
     * @param subject The address to check
     * @return rtype The restriction type
     * @return expiry When the restriction expires
     * @return overridden Whether DAO has overridden
     */
    function getRestrictionStatus(address subject) external view returns (
        RestrictionType rtype,
        uint64 expiry,
        bool overridden
    ) {
        return (activeRestriction[subject], restrictionExpiry[subject], daoOverridden[subject]);
    }
    
    /**
     * @notice Check if address can perform governance actions
     * @param subject The address to check
     */
    function canParticipateInGovernance(address subject) external view returns (bool) {
        RestrictionType r = activeRestriction[subject];
        if (r == RestrictionType.GovernanceBan || r == RestrictionType.FullFreeze) {
            // Check if restriction has expired
            if (block.timestamp < restrictionExpiry[subject]) {
                return false;
            }
        }
        return true;
    }
    
    /**
     * @notice Check if address can make transfers
     * @param subject The address to check
     */
    function canTransfer(address subject) external view returns (bool) {
        RestrictionType r = activeRestriction[subject];
        if (r == RestrictionType.TransferLimit || r == RestrictionType.FullFreeze) {
            if (block.timestamp < restrictionExpiry[subject]) {
                return false;
            }
        }
        return true;
    }
    
    /**
     * @notice Get violation count for a user
     */
    function getViolationCounts(address subject) external view returns (
        uint8 suspiciousTransfer,
        uint8 rapidScoreDrop,
        uint8 spamActivity,
        uint8 failedRecovery,
        uint8 governanceAbuse
    ) {
        return (
            violationCount[subject][ViolationType.SuspiciousTransfer],
            violationCount[subject][ViolationType.RapidScoreDrop],
            violationCount[subject][ViolationType.SpamActivity],
            violationCount[subject][ViolationType.FailedRecovery],
            violationCount[subject][ViolationType.GovernanceAbuse]
        );
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                            INTERNAL
    // ═══════════════════════════════════════════════════════════════════════
    
    function _log(string memory action) internal {
        if (address(ledger) != address(0)) {
            try ledger.logSystemEvent(address(this), action, msg.sender) {} catch { emit LedgerLogFailed(address(this), action); }
        }
    }
}
