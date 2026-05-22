// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * SeerSocial.sol - Extension contract for Seer social features
 *
 * This contract handles:
 * - Endorsements (social proof with decay/limits)
 * - Mentorship (peer onboarding and sponsorship)
 * - Appeals and disputes (score review requests)
 *
 * Separated from main Seer to stay under 24KB contract size limit.
 */

/// @notice Interface to read from main Seer contract
/// @title ISeerCore
/// @author Vfide
interface ISeerCore {
    /// @notice dao
    /// @return _address _address
    function dao() external view returns (address);
    /// @notice getScore
    /// @param subject subject
    /// @return _uint16 _uint16
    function getScore(address subject) external view returns (uint16);
    /// @notice highTrustThreshold
    /// @return _uint16 _uint16
    function highTrustThreshold() external view returns (uint16);
    /// @notice hasBadge
    /// @param subject subject
    /// @param badge badge
    /// @return _bool _bool
    function hasBadge(address subject, bytes32 badge) external view returns (bool);
    /// @notice badgeExpiry
    /// @param subject subject
    /// @param badge badge
    /// @return _uint256 _uint256
    function badgeExpiry(address subject, bytes32 badge) external view returns (uint256);
    /// @notice paused
    /// @return _bool _bool
    function paused() external view returns (bool);
    /// @notice ledger
    /// @return _address _address
    function ledger() external view returns (address);
}

/// @notice Interface for ProofLedger logging
/// @title IProofLedgerSocial
/// @author Vfide
interface IProofLedgerSocial {
    /// @notice logEvent
    /// @param who who
    /// @param action action
    /// @param amount amount
    /// @param note note
    function logEvent(address who, string calldata action, uint256 amount, string calldata note) external;
    /// @notice logSystemEvent
    /// @param who who
    /// @param action action
    /// @param by by
    function logSystemEvent(address who, string calldata action, address by) external;
}

/// @notice ISeerPolicyGuard_Social
/// @title ISeerPolicyGuard_Social
/// @author Vfide
interface ISeerPolicyGuard_Social {
    /// @notice consume
    /// @param selector selector
    /// @param pclass pclass
    function consume(bytes4 selector, uint8 pclass) external;
}
/// @notice SOCIAL_PolicyGuardNotSet
error SOCIAL_PolicyGuardNotSet();

/// ────────────────────────── Errors
/// @notice SOCIAL_NotDAO
error SOCIAL_NotDAO();
/// @notice SOCIAL_NotSeer
error SOCIAL_NotSeer();
/// @notice SOCIAL_Zero
error SOCIAL_Zero();
/// @notice SOCIAL_Bounds
error SOCIAL_Bounds();
/// @notice SOCIAL_Paused
error SOCIAL_Paused();
/// @notice SOCIAL_InvalidEndorse
error SOCIAL_InvalidEndorse();
/// @notice SOCIAL_EndorseLimit
error SOCIAL_EndorseLimit();
/// @notice SOCIAL_EndorseExists
error SOCIAL_EndorseExists();

/**
 * @title SeerSocial
 * @notice Extension contract for Seer social features (endorsements, mentorship, appeals)
 */
// ReentrancyGuard intentionally omitted: social graph operations do not move funds.
/// @notice SeerSocial
/// @title SeerSocial
/// @author Vfide
contract SeerSocial {
    // ═══════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════
    /// @notice UserEndorsed
    /// @param endorser endorser
    /// @param subject subject
    /// @param weight weight
    /// @param expiry expiry
    /// @param reason reason
    event UserEndorsed(address indexed endorser, address indexed subject, uint16 weight, uint64 expiry, string reason);
    /// @notice EndorsementRevoked
    /// @param endorser endorser
    /// @param subject subject
    /// @param weight weight
    /// @param reason reason
    event EndorsementRevoked(address indexed endorser, address indexed subject, uint16 weight, string reason);
    /// @notice MentorRegistered
    /// @param mentor mentor
    event MentorRegistered(address indexed mentor);
    /// @notice MentorRevoked
    /// @param mentor mentor
    event MentorRevoked(address indexed mentor);
    /// @notice MenteeSponsored
    /// @param mentor mentor
    /// @param mentee mentee
    event MenteeSponsored(address indexed mentor, address indexed mentee);
    /// @notice MenteeRemoved
    /// @param mentor mentor
    /// @param mentee mentee
    event MenteeRemoved(address indexed mentor, address indexed mentee);
    /// @notice MentorConfigUpdated
    /// @param minScore minScore
    /// @param maxMentees maxMentees
    event MentorConfigUpdated(uint16 minScore, uint16 maxMentees);
    /// @notice AppealFiled
    /// @param subject subject
    /// @param reason reason
    event AppealFiled(address indexed subject, string reason);
    /// @notice AppealResolved
    /// @param subject subject
    /// @param approved approved
    /// @param resolution resolution
    event AppealResolved(address indexed subject, bool approved, string resolution);
    /// @notice ScoreDisputeRequested
    /// @param subject subject
    /// @param reason reason
    event ScoreDisputeRequested(address indexed subject, string reason);
    /// @notice ScoreDisputeResolved
    /// @param subject subject
    /// @param approved approved
    /// @param adjustment adjustment
    event ScoreDisputeResolved(address indexed subject, bool approved, int256 adjustment);
    /// @notice EndorsementPolicySet
    event EndorsementPolicySet();
    /// @notice EndorserPruned
    /// @param endorser endorser
    /// @param endorsementsCleaned endorsementsCleaned
    event EndorserPruned(address indexed endorser, uint256 endorsementsCleaned);
    /// @notice BATCH-14 FIX: Events for Seer reference timelock
    /// @param pending pending
    /// @param effectiveAt effectiveAt
    event SeerChangeProposed(address indexed pending, uint64 effectiveAt);
    /// @notice SeerChangeCancelled
    event SeerChangeCancelled();
    /// @notice SeerChanged
    /// @param newSeer newSeer
    event SeerChanged(address indexed newSeer);

    // ═══════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════

    /// @notice seer
    ISeerCore public seer;
    /// @notice policyGuard
    address public policyGuard;
    /// @notice POLICY_CLASS_CRITICAL
    uint8 private constant POLICY_CLASS_CRITICAL = 0;
    /// @notice SEL_SET_ENDORSEMENT_POLICY
    bytes4 private constant SEL_SET_ENDORSEMENT_POLICY = bytes4(keccak256("setEndorsementPolicy(uint16,uint16,uint16,uint16,uint16,uint64,uint64,uint16)"));
    /// @notice PolicyGuardSet
    /// @param newPolicyGuard newPolicyGuard
    event PolicyGuardSet(address indexed newPolicyGuard);
    /// @notice BATCH-14 FIX: Timelock state for Seer reference changes (48-hour delay).
    address public pendingSeer;
    /// @notice pendingSeerAt
    uint64 public pendingSeerAt;
    /// @notice SEER_CHANGE_DELAY
    uint64 public constant SEER_CHANGE_DELAY = 48 hours;

    // ═══════════════════════════════════════════════════════════════════════
    // ENDORSEMENTS - Social proof with decay/limits
    // ═══════════════════════════════════════════════════════════════════════
    struct Endorsement {
        uint64 expiry;
        uint16 weight;
        uint64 timestamp;
    }

    /// @notice endorsements
    mapping(address => mapping(address => Endorsement)) public endorsements; // subject => endorser => endorsement
    /// @notice endorsersOf
    mapping(address => address[]) private endorsersOf; // subject => list of endorsers
    /// @notice endorsementsReceived
    mapping(address => uint16) public endorsementsReceived; // active endorsements per subject
    // F-36 FIX: Incremental cache for endorsement bonus — avoids O(n) SLOADs on every score read.
    /// @notice cachedEndorsementBonus
    mapping(address => uint256) public cachedEndorsementBonus; // running total, invalidated by prune
    /// @notice cachedEndorsementExpiry
    mapping(address => uint64) public cachedEndorsementExpiry; // min(expiry) of active endorsements; 0 = dirty
    /// @notice endorsementsGiven
    mapping(address => uint16) public endorsementsGiven; // active endorsements given by user
    /// @notice lastEndorseTime
    mapping(address => uint64) public lastEndorseTime; // cooldown tracker per endorser
    /// @notice lastActivity
    mapping(address => uint64) public lastActivity; // For decay tracking
    /// @notice endorsedSubjects
    mapping(address => address[]) private endorsedSubjects; // subjects each endorser has endorsed (for cleanup)
    /// @notice hasEndorsed
    mapping(address => mapping(address => bool)) public hasEndorsed; // endorser => subject => tracked in endorsedSubjects

    /// @notice endorsementBaseValue
    uint16 public endorsementBaseValue = 40; // 0.40% boost per endorsement (10x scale)
    /// @notice endorsementMaxPerEndorser
    uint16 public endorsementMaxPerEndorser = 80; // clamp per endorsement
    /// @notice endorsementBonusCap
    uint16 public endorsementBonusCap = 1500; // total endorsement bonus cap (15% on 10x scale)
    /// @notice maxEndorsersPerSubject
    uint16 public maxEndorsersPerSubject = 25; // keep loops bounded
    /// @notice maxActiveGivenPerUser
    uint16 public maxActiveGivenPerUser = 50; // prevent spam endorsing
    /// @notice endorsementValidity
    uint64 public endorsementValidity = 90 days; // endorsements expire and must be renewed
    /// @notice endorsementCooldown
    uint64 public endorsementCooldown = 1 days; // per-endorser cooldown
    /// @notice minScoreToEndorse
    uint16 public minScoreToEndorse = 7000; // high-trust minimum

    // ═══════════════════════════════════════════════════════════════════════
    // MENTORSHIP - Peer onboarding and sponsorship
    // ═══════════════════════════════════════════════════════════════════════

    /// @notice mentors
    mapping(address => bool) public mentors; // mentor status
    /// @notice mentorOf
    mapping(address => address) public mentorOf; // mentee => mentor
    /// @notice menteesOf
    mapping(address => address[]) private menteesOf; // mentor => mentees

    /// @notice minScoreToMentor
    uint16 public minScoreToMentor = 7200; // default high score requirement
    /// @notice maxMenteesPerMentor
    uint16 public maxMenteesPerMentor = 50; // bound mentee list size

    // ═══════════════════════════════════════════════════════════════════════
    // DISPUTES & APPEALS
    // ═══════════════════════════════════════════════════════════════════════

    struct ScoreDispute {
        address requester;
        string reason;
        uint64 timestamp;
        bool resolved;
        bool approved;
    }

    /// @notice scoreDisputes
    mapping(address => ScoreDispute) public scoreDisputes;
    /// @notice pendingDisputeCount
    uint256 public pendingDisputeCount;

    struct Appeal {
        address requester;
        string reason;
        uint64 timestamp;
        bool resolved;
        bool approved;
        string resolution;
    }

    /// @notice appeals
    mapping(address => Appeal) public appeals;
    /// @notice pendingAppealCount
    uint256 public pendingAppealCount;

    // ═══════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════

    /// @notice onlyDAO
    modifier onlyDAO() {
        if (msg.sender != seer.dao()) revert SOCIAL_NotDAO();
        _;
    }

    /// @notice onlyNotPaused
    modifier onlyNotPaused() {
        if (seer.paused()) revert SOCIAL_Paused();
        _;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════

    /// @notice constructor
    /// @param _seer _seer
    constructor(address _seer) {
        if (_seer == address(0)) revert SOCIAL_Zero();
        seer = ISeerCore(_seer);
    }

    /// @notice BATCH-14 FIX: Propose a new Seer reference with a 48-hour timelock.
    /// @dev Use proposeSeer + applySeer for all Seer reference changes.
    ///      The legacy instant setSeer() has been removed to enforce the timelock.
    /// @param _seer _seer
    function proposeSeer(address _seer) external onlyDAO {
        if (_seer == address(0)) revert SOCIAL_Zero();
        pendingSeer = _seer;
        pendingSeerAt = uint64(block.timestamp) + SEER_CHANGE_DELAY;
        emit SeerChangeProposed(_seer, pendingSeerAt);
    }

    /// @notice Apply the pending Seer reference after the timelock has elapsed.
    function applySeer() external onlyDAO {
        require(pendingSeer != address(0), "SOCIAL: no pending seer");
        require(block.timestamp >= pendingSeerAt, "SOCIAL: seer timelock active");
        seer = ISeerCore(pendingSeer);
        emit SeerChanged(pendingSeer);
        pendingSeer = address(0);
        pendingSeerAt = 0;
    }

    /// @notice Cancel a pending Seer reference change.
    function cancelSeerChange() external onlyDAO {
        pendingSeer = address(0);
        pendingSeerAt = 0;
        emit SeerChangeCancelled();
    }

    /// @notice Set SeerPolicyGuard used for endorsement policy timelock consumption.
    /// @param _policyGuard _policyGuard
    function setPolicyGuard(address _policyGuard) external onlyDAO {
        if (_policyGuard == address(0)) revert SOCIAL_Zero();
        policyGuard = _policyGuard;
        emit PolicyGuardSet(_policyGuard);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ENDORSEMENT FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════

    /// @notice setEndorsementPolicy
    /// @param baseValue baseValue
    /// @param maxPerEndorser maxPerEndorser
    /// @param bonusCap bonusCap
    /// @param maxPerSubject maxPerSubject
    /// @param maxGiven maxGiven
    /// @param validity validity
    /// @param cooldown cooldown
    /// @param minScore minScore
    function setEndorsementPolicy(uint16 baseValue, uint16 maxPerEndorser, uint16 bonusCap, uint16 maxPerSubject, uint16 maxGiven, uint64 validity, uint64 cooldown, uint16 minScore) external onlyDAO {
        // F-85 FIX: Require Seer-side timelock consumption for endorsement policy changes.
        if (policyGuard == address(0)) revert SOCIAL_PolicyGuardNotSet();
        ISeerPolicyGuard_Social(policyGuard).consume(SEL_SET_ENDORSEMENT_POLICY, POLICY_CLASS_CRITICAL);

        require(baseValue > 0 && baseValue <= 200, "SOCIAL: base out of range");
        require(maxPerEndorser >= baseValue && maxPerEndorser <= 300, "SOCIAL: max per endorser");
        require(bonusCap >= baseValue, "SOCIAL: bonus cap low");
        require(maxPerSubject > 0 && maxPerSubject <= 50, "SOCIAL: subject cap");
        require(maxGiven > 0 && maxGiven <= 200, "SOCIAL: given cap");
        require(validity >= 7 days && validity <= 365 days, "SOCIAL: validity range");
        require(cooldown >= 10 minutes && cooldown <= 7 days, "SOCIAL: cooldown range");
        require(minScore >= 10 && minScore <= 10000, "SOCIAL: min score range");

        endorsementBaseValue = baseValue;
        endorsementMaxPerEndorser = maxPerEndorser;
        endorsementBonusCap = bonusCap;
        maxEndorsersPerSubject = maxPerSubject;
        maxActiveGivenPerUser = maxGiven;
        endorsementValidity = validity;
        endorsementCooldown = cooldown;
        minScoreToEndorse = minScore;
        emit EndorsementPolicySet();
        _logSystem("endorsement_policy_set");
    }

    /// @notice endorse
    /// @param subject subject
    /// @param reason reason
    function endorse(address subject, string calldata reason) external onlyNotPaused {
        if (subject == address(0) || subject == msg.sender) revert SOCIAL_InvalidEndorse();
        if (bytes(reason).length > 160) revert SOCIAL_Bounds();

        // Rate limit endorsers
        if (endorsementCooldown > 0) {
            require(block.timestamp >= lastEndorseTime[msg.sender] + endorsementCooldown, "SOCIAL: endorse cooldown");
        }

        uint16 endorserScore = seer.getScore(msg.sender);
        if (endorserScore < minScoreToEndorse) revert SOCIAL_EndorseLimit();

        _pruneExpiredEndorsements(subject);

        Endorsement storage existing = endorsements[subject][msg.sender];
        if (existing.expiry > block.timestamp) revert SOCIAL_EndorseExists();

        // F-71 FIX: endorsementsReceived is the canonical active counter.
        uint16 activeReceived = endorsementsReceived[subject];
        if (activeReceived >= maxEndorsersPerSubject) revert SOCIAL_EndorseLimit();
        if (endorsementsGiven[msg.sender] >= maxActiveGivenPerUser) revert SOCIAL_EndorseLimit();

        uint16 weight = endorsementBaseValue;
        if (endorserScore >= seer.highTrustThreshold()) weight += 10;
        if (_checkActiveBadge(msg.sender, keccak256("TRUSTED_ENDORSER"))) weight += 10;
        if (weight > endorsementMaxPerEndorser) weight = endorsementMaxPerEndorser;

        uint256 currentBonus = calculateEndorsementBonus(subject);
        require(currentBonus + weight <= endorsementBonusCap, "SOCIAL: endorsement cap");

        uint64 expiry = uint64(block.timestamp + endorsementValidity);

        endorsements[subject][msg.sender] = Endorsement({expiry: expiry, weight: weight, timestamp: uint64(block.timestamp)});
        require(endorsersOf[subject].length < 200, "SOCIAL: endorser cap"); // I-11
        endorsersOf[subject].push(msg.sender);
        endorsementsReceived[subject] = activeReceived + 1;
        ++endorsementsGiven[msg.sender];
        // F-36 FIX: Update incremental cache.
        cachedEndorsementBonus[subject] += weight;
        if (cachedEndorsementExpiry[subject] == 0 || expiry < cachedEndorsementExpiry[subject]) {
            cachedEndorsementExpiry[subject] = expiry;
        }

        // F-86 FIX: Track each (endorser, subject) once to prevent duplicate growth.
        if (!hasEndorsed[msg.sender][subject]) {
            endorsedSubjects[msg.sender].push(subject);
            hasEndorsed[msg.sender][subject] = true;
        }

        lastEndorseTime[msg.sender] = uint64(block.timestamp);
        lastActivity[subject] = uint64(block.timestamp);

        emit UserEndorsed(msg.sender, subject, weight, expiry, reason);
        _logEv(subject, "endorsement", weight, reason);
    }

    /// @notice Revoke an active endorsement before expiry.
    /// @dev F-74: Endorsers need an explicit opt-out path for newly malicious subjects.
    /// @param subject subject
    /// @param reason reason
    function revokeEndorsement(address subject, string calldata reason) external onlyNotPaused {
        Endorsement storage e = endorsements[subject][msg.sender];
        if (e.expiry <= block.timestamp || e.weight == 0) revert SOCIAL_InvalidEndorse();

        uint16 weight = e.weight;
        uint64 expiry = e.expiry;
        delete endorsements[subject][msg.sender];

        if (endorsementsReceived[subject] > 0) --endorsementsReceived[subject];
        if (endorsementsGiven[msg.sender] > 0) --endorsementsGiven[msg.sender];
        _removeEndorserFromSubjectList(subject, msg.sender);

        // Keep cache coherent for fast-path reads.
        if (cachedEndorsementBonus[subject] >= weight) {
            cachedEndorsementBonus[subject] -= weight;
        } else {
            cachedEndorsementBonus[subject] = 0;
        }
        if (cachedEndorsementExpiry[subject] == expiry) {
            // Conservative invalidation: next read falls back to full recompute.
            cachedEndorsementExpiry[subject] = 0;
        }

        emit EndorsementRevoked(msg.sender, subject, weight, reason);
        _logEv(subject, "endorsement_revoke", weight, reason);
    }

    /// @notice pruneEndorsements
    /// @param subject subject
    function pruneEndorsements(address subject) external onlyNotPaused {
        _pruneExpiredEndorsements(subject);
    }

    /**
     * @notice Prune expired endorsements given by the caller across all subjects.
     * @dev Allows endorsers to clean up their own stale endorsement counter (L-9 FIX).
     * @return cleaned Count of cleaned-up endorsements
     */
    function pruneOwnEndorsements() external returns (uint256 cleaned) {
        cleaned = 0;
        address[] storage subjects = endorsedSubjects[msg.sender];
        uint256 len = subjects.length;

        for (uint256 i = 0; i < len; ++i) {
            address subject = subjects[i];
            Endorsement storage e = endorsements[subject][msg.sender];

            // If endorsement expired, clean it up
            if (e.expiry > 0 && e.expiry <= block.timestamp) {
                uint16 weight = e.weight;
                uint64 expiry = e.expiry;
                delete endorsements[subject][msg.sender];
                if (endorsementsReceived[subject] > 0) --endorsementsReceived[subject];
                if (endorsementsGiven[msg.sender] > 0) --endorsementsGiven[msg.sender];
                _removeEndorserFromSubjectList(subject, msg.sender);
                if (cachedEndorsementBonus[subject] >= weight) {
                    cachedEndorsementBonus[subject] -= weight;
                } else {
                    cachedEndorsementBonus[subject] = 0;
                }
                if (cachedEndorsementExpiry[subject] == expiry) {
                    cachedEndorsementExpiry[subject] = 0;
                }
                ++cleaned;
            }
        }

        if (cleaned > 0) {
            emit EndorserPruned(msg.sender, cleaned);
        }
    }

    /// @notice calculateEndorsementBonus
    /// @param subject subject
    /// @return bonus bonus
    function calculateEndorsementBonus(address subject) public view returns (uint256 bonus) {
        // F-36 FIX: return incremental cache when none of the active endorsements have expired yet.
        uint64 cacheExpiry = cachedEndorsementExpiry[subject];
        if (cacheExpiry > block.timestamp) {
            bonus = cachedEndorsementBonus[subject];
            if (bonus > endorsementBonusCap) bonus = endorsementBonusCap;
            return bonus;
        }
        // Cache stale: full recompute (also used on first call).
        address[] storage endorsers = endorsersOf[subject];
        uint256 len = endorsers.length;
        for (uint256 i = 0; i < len; ++i) {
            address endorser = endorsers[i];
            Endorsement storage e = endorsements[subject][endorser];
            if (e.weight > 0 && e.expiry > block.timestamp) {
                // F-35 FIX: Only count endorsements from endorsers still in good standing.
                if (seer.getScore(endorser) >= minScoreToEndorse) {
                    bonus += e.weight;
                }
            }
        }
        if (bonus > endorsementBonusCap) {
            bonus = endorsementBonusCap;
        }
    }

    /// @notice getEndorsementStats
    /// @param subject subject
    /// @return activeEndorsers activeEndorsers
    /// @return activeBonus activeBonus
    /// @return endorsementsYouGave endorsementsYouGave
    function getEndorsementStats(address subject) external view returns (uint16 activeEndorsers, uint16 activeBonus, uint16 endorsementsYouGave) {
        address[] storage endorsers = endorsersOf[subject];
        uint256 len = endorsers.length;
        for (uint256 i = 0; i < len; ++i) {
            Endorsement storage e = endorsements[subject][endorsers[i]];
            if (e.expiry > block.timestamp && e.weight > 0) {
                ++activeEndorsers;
            }
        }
        activeBonus = uint16(calculateEndorsementBonus(subject));
        endorsementsYouGave = endorsementsGiven[subject];
    }

    /// @notice getActiveEndorsements
    /// @param subject subject
    /// @return endorsers endorsers
    /// @return weights weights
    /// @return expiries expiries
    /// @return timestamps timestamps
    function getActiveEndorsements(address subject) external view returns (address[] memory endorsers, uint16[] memory weights, uint64[] memory expiries, uint64[] memory timestamps) {
        address[] storage stored = endorsersOf[subject];
        uint256 len = stored.length;
        uint256 activeCount = 0;

        for (uint256 i = 0; i < len; ++i) {
            Endorsement storage e = endorsements[subject][stored[i]];
            if (e.expiry > block.timestamp && e.weight > 0) {
                ++activeCount;
            }
        }

        endorsers = new address[](activeCount);
        weights = new uint16[](activeCount);
        expiries = new uint64[](activeCount);
        timestamps = new uint64[](activeCount);

        uint256 idx = 0;
        for (uint256 i = 0; i < len; ++i) {
            Endorsement storage e = endorsements[subject][stored[i]];
            if (e.expiry > block.timestamp && e.weight > 0) {
                endorsers[idx] = stored[i];
                weights[idx] = e.weight;
                expiries[idx] = e.expiry;
                timestamps[idx] = e.timestamp;
                ++idx;
            }
        }
    }

    /// @notice getEndorserCount
    /// @param subject subject
    /// @return _uint256 _uint256
    function getEndorserCount(address subject) external view returns (uint256) {
        return endorsersOf[subject].length;
    }

    /// @notice getEndorserAt
    /// @param subject subject
    /// @param index index
    /// @return _address _address
    function getEndorserAt(address subject, uint256 index) external view returns (address) {
        return endorsersOf[subject][index];
    }

    /// @notice _pruneExpiredEndorsements
    /// @param subject subject
    function _pruneExpiredEndorsements(address subject) internal {
        address[] storage endorsers = endorsersOf[subject];
        uint256 i = 0;
        while (i < endorsers.length) {
            address endorser = endorsers[i];
            Endorsement storage e = endorsements[subject][endorser];
            if (e.expiry > 0 && e.expiry <= block.timestamp) {
                delete endorsements[subject][endorser];
                if (endorsementsReceived[subject] > 0) --endorsementsReceived[subject];
                if (endorsementsGiven[endorser] > 0) --endorsementsGiven[endorser];
                endorsers[i] = endorsers[endorsers.length - 1];
                endorsers.pop();
                continue;
            }
            ++i;
        }
        endorsementsReceived[subject] = uint16(endorsers.length);
        // F-36 FIX: Rebuild incremental cache after prune so next read is O(1).
        uint256 newBonus;
        uint64 newMinExpiry;
        uint256 eLen = endorsers.length;
        for (uint256 j = 0; j < eLen; ++j) {
            Endorsement storage pe = endorsements[subject][endorsers[j]];
            if (pe.weight > 0 && pe.expiry > block.timestamp) {
                newBonus += pe.weight;
                if (newMinExpiry == 0 || pe.expiry < newMinExpiry) newMinExpiry = pe.expiry;
            }
        }
        cachedEndorsementBonus[subject] = newBonus > endorsementBonusCap ? endorsementBonusCap : newBonus;
        cachedEndorsementExpiry[subject] = newMinExpiry;
    }

    /// @notice _removeEndorserFromSubjectList
    /// @param subject subject
    /// @param endorser endorser
    function _removeEndorserFromSubjectList(address subject, address endorser) internal {
        address[] storage endorsers = endorsersOf[subject];
        uint256 len = endorsers.length;
        for (uint256 i = 0; i < len; ++i) {
            if (endorsers[i] == endorser) {
                endorsers[i] = endorsers[len - 1];
                endorsers.pop();
                break;
            }
        }
    }

    /// @notice _checkActiveBadge
    /// @param subject subject
    /// @param badge badge
    /// @return _bool _bool
    function _checkActiveBadge(address subject, bytes32 badge) internal view returns (bool) {
        if (!seer.hasBadge(subject, badge)) return false;
        uint256 expiry = seer.badgeExpiry(subject, badge);
        return expiry == 0 || expiry > block.timestamp;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // MENTORSHIP FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════

    /// @notice setMentorConfig
    /// @param minScore minScore
    /// @param maxMentees maxMentees
    function setMentorConfig(uint16 minScore, uint16 maxMentees) external onlyDAO {
        require(minScore >= 5000 && minScore <= 10000, "SOCIAL: mentor min out of range");
        require(maxMentees >= 1 && maxMentees <= 200, "SOCIAL: mentor max out of range");
        minScoreToMentor = minScore;
        maxMenteesPerMentor = maxMentees;
        emit MentorConfigUpdated(minScore, maxMentees);
    }

    /// @notice becomeMentor
    function becomeMentor() external onlyNotPaused {
        require(!mentors[msg.sender], "SOCIAL: already mentor");
        require(seer.getScore(msg.sender) >= minScoreToMentor, "SOCIAL: score too low");
        mentors[msg.sender] = true;
        emit MentorRegistered(msg.sender);
        _logSystem("mentor_registered");
    }

    /// @notice revokeMentor
    /// @param mentor mentor
    function revokeMentor(address mentor) external {
        if (msg.sender != mentor) {
            if (msg.sender != seer.dao()) revert SOCIAL_NotDAO();
        }
        mentors[mentor] = false;
        emit MentorRevoked(mentor);
        _logSystem("mentor_revoked");
    }

    /// @notice sponsorMentee
    /// @param mentee mentee
    function sponsorMentee(address mentee) external onlyNotPaused {
        require(mentors[msg.sender], "SOCIAL: not mentor");
        require(mentee != address(0) && mentee != msg.sender, "SOCIAL: invalid mentee");
        require(mentorOf[mentee] == address(0), "SOCIAL: mentee has mentor");
        require(menteesOf[msg.sender].length < maxMenteesPerMentor, "SOCIAL: max mentees");
        require(seer.getScore(msg.sender) >= minScoreToMentor, "SOCIAL: mentor score too low");

        mentorOf[mentee] = msg.sender;
        menteesOf[msg.sender].push(mentee);

        emit MenteeSponsored(msg.sender, mentee);
        _logEv(mentee, "mentee_sponsored", 0, "");
    }

    /// @notice removeMentee
    /// @param mentee mentee
    function removeMentee(address mentee) external {
        address mentor = mentorOf[mentee];
        require(mentor != address(0), "SOCIAL: no mentor");
        if (msg.sender != mentor) {
            if (msg.sender != seer.dao()) revert SOCIAL_NotDAO();
        }
        _removeMentee(mentor, mentee);
    }

    /// @notice _removeMentee
    /// @param mentor mentor
    /// @param mentee mentee
    function _removeMentee(address mentor, address mentee) internal {
        address[] storage list = menteesOf[mentor];
        uint256 len = list.length;
        for (uint256 i = 0; i < len; ++i) {
            if (list[i] == mentee) {
                list[i] = list[len - 1];
                list.pop();
                break;
            }
        }
        mentorOf[mentee] = address(0);
        emit MenteeRemoved(mentor, mentee);
        _logEv(mentee, "mentee_removed", 0, "");
    }

    /// @notice getMentees
    /// @param mentor mentor
    /// @return _arg _arg
    function getMentees(address mentor) external view returns (address[] memory) {
        return menteesOf[mentor];
    }

    /// @notice getMentorInfo
    /// @param subject subject
    /// @return isMentorUser isMentorUser
    /// @return mentor mentor
    /// @return menteeCount menteeCount
    /// @return hasMentor hasMentor
    /// @return canBecome canBecome
    /// @return minScore minScore
    /// @return currentScore currentScore
    function getMentorInfo(address subject) external view returns (bool isMentorUser, address mentor, uint16 menteeCount, bool hasMentor, bool canBecome, uint16 minScore, uint16 currentScore) {
        currentScore = seer.getScore(subject);
        minScore = minScoreToMentor;
        isMentorUser = mentors[subject];
        mentor = mentorOf[subject];
        hasMentor = mentor != address(0);
        menteeCount = uint16(menteesOf[subject].length);
        canBecome = !isMentorUser && currentScore >= minScoreToMentor;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // DISPUTE & APPEAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════

    /// @notice requestScoreReview
    /// @param reason reason
    function requestScoreReview(string calldata reason) external {
        require(bytes(reason).length > 0 && bytes(reason).length <= 500, "SOCIAL: invalid reason length");
        require(scoreDisputes[msg.sender].timestamp < 1 || scoreDisputes[msg.sender].resolved, "SOCIAL: dispute pending");

        scoreDisputes[msg.sender] = ScoreDispute({requester: msg.sender, reason: reason, timestamp: uint64(block.timestamp), resolved: false, approved: false});

        ++pendingDisputeCount;

        emit ScoreDisputeRequested(msg.sender, reason);
        _logEv(msg.sender, "score_dispute_requested", 0, reason);
    }

    /// @notice resolveScoreDispute
    /// @param subject subject
    /// @param approved approved
    /// @param adjustment adjustment
    function resolveScoreDispute(address subject, bool approved, int16 adjustment) external onlyDAO {
        ScoreDispute storage dispute = scoreDisputes[subject];
        require(dispute.timestamp > 0, "SOCIAL: no dispute found");
        require(!dispute.resolved, "SOCIAL: already resolved");

        dispute.resolved = true;
        dispute.approved = approved;

        // Note: Score adjustment must be done via main Seer contract
        // This contract only tracks the dispute status

        if (pendingDisputeCount > 0) {
            --pendingDisputeCount;
        }

        emit ScoreDisputeResolved(subject, approved, adjustment);
        _logEv(subject, "score_dispute_resolved", approved ? 1 : 0, "");
    }

    /// @notice fileAppeal
    /// @param reason reason
    function fileAppeal(string calldata reason) external {
        require(bytes(reason).length > 0 && bytes(reason).length <= 500, "SOCIAL: invalid reason length");
        Appeal storage existing = appeals[msg.sender];
        require(existing.timestamp == 0 || existing.resolved, "SOCIAL: appeal pending");

        appeals[msg.sender] = Appeal({requester: msg.sender, reason: reason, timestamp: uint64(block.timestamp), resolved: false, approved: false, resolution: ""});

        ++pendingAppealCount;
        emit AppealFiled(msg.sender, reason);
        _logEv(msg.sender, "appeal_filed", 0, reason);
    }

    /// @notice resolveAppeal
    /// @param subject subject
    /// @param approved approved
    /// @param resolution resolution
    function resolveAppeal(address subject, bool approved, string calldata resolution) external onlyDAO {
        Appeal storage appeal = appeals[subject];
        require(appeal.timestamp > 0, "SOCIAL: no appeal");
        require(!appeal.resolved, "SOCIAL: appeal resolved");

        appeal.resolved = true;
        appeal.approved = approved;
        appeal.resolution = resolution;

        if (pendingAppealCount > 0) {
            --pendingAppealCount;
        }

        emit AppealResolved(subject, approved, resolution);
        _logEv(subject, "appeal_resolved", 0, resolution);
    }

    /// @notice getDisputeInfo
    /// @param subject subject
    /// @return hasDispute hasDispute
    /// @return disputeResolved disputeResolved
    /// @return disputeApproved disputeApproved
    /// @return disputeTimestamp disputeTimestamp
    /// @return disputeReason disputeReason
    function getDisputeInfo(address subject) external view returns (bool hasDispute, bool disputeResolved, bool disputeApproved, uint64 disputeTimestamp, string memory disputeReason) {
        ScoreDispute storage d = scoreDisputes[subject];
        hasDispute = d.timestamp > 0;
        disputeResolved = d.resolved;
        disputeApproved = d.approved;
        disputeTimestamp = d.timestamp;
        disputeReason = d.reason;
    }

    /// @notice getAppealInfo
    /// @param subject subject
    /// @return hasAppeal hasAppeal
    /// @return appealResolved appealResolved
    /// @return appealApproved appealApproved
    /// @return appealTimestamp appealTimestamp
    /// @return appealReason appealReason
    /// @return appealResolution appealResolution
    function getAppealInfo(
        address subject
    ) external view returns (bool hasAppeal, bool appealResolved, bool appealApproved, uint64 appealTimestamp, string memory appealReason, string memory appealResolution) {
        Appeal storage a = appeals[subject];
        hasAppeal = a.timestamp > 0;
        appealResolved = a.resolved;
        appealApproved = a.approved;
        appealTimestamp = a.timestamp;
        appealReason = a.reason;
        appealResolution = a.resolution;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // LOGGING HELPERS
    // ═══════════════════════════════════════════════════════════════════════

    /// @notice _logEv
    /// @param who who
    /// @param action action
    /// @param amt amt
    /// @param note note
    function _logEv(address who, string memory action, uint256 amt, string memory note) internal {
        address ledgerAddr = seer.ledger();
        if (ledgerAddr != address(0)) {
            try IProofLedgerSocial(ledgerAddr).logEvent(who, action, amt, note) {} catch {}
        }
    }

    /// @notice _logSystem
    /// @param action action
    function _logSystem(string memory action) internal {
        address ledgerAddr = seer.ledger();
        if (ledgerAddr != address(0)) {
            try IProofLedgerSocial(ledgerAddr).logSystemEvent(address(this), action, msg.sender) {} catch {}
        }
    }
}
