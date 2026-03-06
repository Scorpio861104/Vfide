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
interface ISeerCore {
    function dao() external view returns (address);
    function getScore(address subject) external view returns (uint16);
    function highTrustThreshold() external view returns (uint16);
    function hasBadge(address subject, bytes32 badge) external view returns (bool);
    function badgeExpiry(address subject, bytes32 badge) external view returns (uint256);
    function paused() external view returns (bool);
    function ledger() external view returns (address);
}

/// @notice Interface for ProofLedger logging
interface IProofLedgerSocial {
    function logEvent(address who, string calldata action, uint256 amount, string calldata note) external;
    function logSystemEvent(address who, string calldata action, address by) external;
}

/// ────────────────────────── Errors
error SOCIAL_NotDAO();
error SOCIAL_NotSeer();
error SOCIAL_Zero();
error SOCIAL_Bounds();
error SOCIAL_Paused();
error SOCIAL_InvalidEndorse();
error SOCIAL_EndorseLimit();
error SOCIAL_EndorseExists();

/**
 * @title SeerSocial
 * @notice Extension contract for Seer social features (endorsements, mentorship, appeals)
 */
contract SeerSocial {
    // ═══════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════
    event UserEndorsed(address indexed endorser, address indexed subject, uint16 weight, uint64 expiry, string reason);
    event MentorRegistered(address indexed mentor);
    event MentorRevoked(address indexed mentor);
    event MenteeSponsored(address indexed mentor, address indexed mentee);
    event MenteeRemoved(address indexed mentor, address indexed mentee);
    event MentorConfigUpdated(uint16 minScore, uint16 maxMentees);
    event AppealFiled(address indexed subject, string reason);
    event AppealResolved(address indexed subject, bool approved, string resolution);
    event ScoreDisputeRequested(address indexed subject, string reason);
    event ScoreDisputeResolved(address indexed subject, bool approved, int256 adjustment);
    event EndorsementPolicySet();

    // ═══════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════
    
    ISeerCore public seer;
    
    // ═══════════════════════════════════════════════════════════════════════
    // ENDORSEMENTS - Social proof with decay/limits
    // ═══════════════════════════════════════════════════════════════════════
    struct Endorsement {
        uint64 expiry;
        uint16 weight;
        uint64 timestamp;
    }

    mapping(address => mapping(address => Endorsement)) public endorsements; // subject => endorser => endorsement
    mapping(address => address[]) private endorsersOf;                       // subject => list of endorsers
    mapping(address => uint16) public endorsementsReceived;                 // active endorsements per subject
    mapping(address => uint16) public endorsementsGiven;                    // active endorsements given by user
    mapping(address => uint64) public lastEndorseTime;                      // cooldown tracker per endorser
    mapping(address => uint64) public lastActivity;                         // For decay tracking

    uint16 public endorsementBaseValue = 40;        // 0.40% boost per endorsement (10x scale)
    uint16 public endorsementMaxPerEndorser = 80;   // clamp per endorsement
    uint16 public endorsementBonusCap = 1500;       // total endorsement bonus cap (15% on 10x scale)
    uint16 public maxEndorsersPerSubject = 25;      // keep loops bounded
    uint16 public maxActiveGivenPerUser = 50;       // prevent spam endorsing
    uint64 public endorsementValidity = 90 days;    // endorsements expire and must be renewed
    uint64 public endorsementCooldown = 1 days;     // per-endorser cooldown
    uint16 public minScoreToEndorse = 7000;         // high-trust minimum

    // ═══════════════════════════════════════════════════════════════════════
    // MENTORSHIP - Peer onboarding and sponsorship
    // ═══════════════════════════════════════════════════════════════════════

    mapping(address => bool) public mentors;        // mentor status
    mapping(address => address) public mentorOf;    // mentee => mentor
    mapping(address => address[]) private menteesOf; // mentor => mentees

    uint16 public minScoreToMentor = 7200;          // default high score requirement
    uint16 public maxMenteesPerMentor = 50;         // bound mentee list size
    
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
    
    mapping(address => ScoreDispute) public scoreDisputes;
    uint256 public pendingDisputeCount;

    struct Appeal {
        address requester;
        string reason;
        uint64 timestamp;
        bool resolved;
        bool approved;
        string resolution;
    }

    mapping(address => Appeal) public appeals;
    uint256 public pendingAppealCount;

    // ═══════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════
    
    modifier onlyDAO() {
        if (msg.sender != seer.dao()) revert SOCIAL_NotDAO();
        _;
    }
    
    modifier onlyNotPaused() {
        if (seer.paused()) revert SOCIAL_Paused();
        _;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════
    
    constructor(address _seer) {
        if (_seer == address(0)) revert SOCIAL_Zero();
        seer = ISeerCore(_seer);
    }
    
    function setSeer(address _seer) external onlyDAO {
        if (_seer == address(0)) revert SOCIAL_Zero();
        seer = ISeerCore(_seer);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ENDORSEMENT FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════

    function setEndorsementPolicy(
        uint16 baseValue,
        uint16 maxPerEndorser,
        uint16 bonusCap,
        uint16 maxPerSubject,
        uint16 maxGiven,
        uint64 validity,
        uint64 cooldown,
        uint16 minScore
    ) external onlyDAO {
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

        uint16 activeReceived = uint16(endorsersOf[subject].length);
        if (activeReceived >= maxEndorsersPerSubject) revert SOCIAL_EndorseLimit();
        if (endorsementsGiven[msg.sender] >= maxActiveGivenPerUser) revert SOCIAL_EndorseLimit();

        uint16 weight = endorsementBaseValue;
        if (endorserScore >= seer.highTrustThreshold()) weight += 10;
        if (_checkActiveBadge(msg.sender, keccak256("TRUSTED_ENDORSER"))) weight += 10;
        if (weight > endorsementMaxPerEndorser) weight = endorsementMaxPerEndorser;

        uint256 currentBonus = calculateEndorsementBonus(subject);
        require(currentBonus + weight <= endorsementBonusCap, "SOCIAL: endorsement cap");

        uint64 expiry = uint64(block.timestamp + endorsementValidity);

        endorsements[subject][msg.sender] = Endorsement({
            expiry: expiry,
            weight: weight,
            timestamp: uint64(block.timestamp)
        });
        endorsersOf[subject].push(msg.sender);
        endorsementsReceived[subject] = activeReceived + 1;
        endorsementsGiven[msg.sender] += 1;
        lastEndorseTime[msg.sender] = uint64(block.timestamp);
        lastActivity[subject] = uint64(block.timestamp);

        emit UserEndorsed(msg.sender, subject, weight, expiry, reason);
        _logEv(subject, "endorsement", weight, reason);
    }

    function pruneEndorsements(address subject) external onlyNotPaused {
        _pruneExpiredEndorsements(subject);
    }

    function calculateEndorsementBonus(address subject) public view returns (uint256 bonus) {
        address[] storage endorsers = endorsersOf[subject];
        uint256 len = endorsers.length;
        for (uint256 i = 0; i < len; i++) {
            Endorsement storage e = endorsements[subject][endorsers[i]];
            if (e.weight > 0 && e.expiry > block.timestamp) {
                bonus += e.weight;
            }
        }
        if (bonus > endorsementBonusCap) {
            bonus = endorsementBonusCap;
        }
    }

    function getEndorsementStats(address subject) external view returns (
        uint16 activeEndorsers,
        uint16 activeBonus,
        uint16 endorsementsYouGave
    ) {
        address[] storage endorsers = endorsersOf[subject];
        uint256 len = endorsers.length;
        for (uint256 i = 0; i < len; i++) {
            Endorsement storage e = endorsements[subject][endorsers[i]];
            if (e.expiry > block.timestamp && e.weight > 0) {
                activeEndorsers++;
            }
        }
        activeBonus = uint16(calculateEndorsementBonus(subject));
        endorsementsYouGave = endorsementsGiven[subject];
    }

    function getActiveEndorsements(address subject) external view returns (
        address[] memory endorsers,
        uint16[] memory weights,
        uint64[] memory expiries,
        uint64[] memory timestamps
    ) {
        address[] storage stored = endorsersOf[subject];
        uint256 len = stored.length;
        uint256 activeCount;

        for (uint256 i = 0; i < len; i++) {
            Endorsement storage e = endorsements[subject][stored[i]];
            if (e.expiry > block.timestamp && e.weight > 0) {
                activeCount++;
            }
        }

        endorsers = new address[](activeCount);
        weights = new uint16[](activeCount);
        expiries = new uint64[](activeCount);
        timestamps = new uint64[](activeCount);

        uint256 idx;
        for (uint256 i = 0; i < len; i++) {
            Endorsement storage e = endorsements[subject][stored[i]];
            if (e.expiry > block.timestamp && e.weight > 0) {
                endorsers[idx] = stored[i];
                weights[idx] = e.weight;
                expiries[idx] = e.expiry;
                timestamps[idx] = e.timestamp;
                idx++;
            }
        }
    }

    function getEndorserCount(address subject) external view returns (uint256) {
        return endorsersOf[subject].length;
    }

    function getEndorserAt(address subject, uint256 index) external view returns (address) {
        return endorsersOf[subject][index];
    }

    function _pruneExpiredEndorsements(address subject) internal {
        address[] storage endorsers = endorsersOf[subject];
        uint256 i = 0;
        while (i < endorsers.length) {
            address endorser = endorsers[i];
            Endorsement storage e = endorsements[subject][endorser];
            if (e.expiry > 0 && e.expiry <= block.timestamp) {
                delete endorsements[subject][endorser];
                if (endorsementsReceived[subject] > 0) endorsementsReceived[subject]--;
                if (endorsementsGiven[endorser] > 0) endorsementsGiven[endorser]--;
                endorsers[i] = endorsers[endorsers.length - 1];
                endorsers.pop();
                continue;
            }
            i++;
        }
        endorsementsReceived[subject] = uint16(endorsers.length);
    }

    function _checkActiveBadge(address subject, bytes32 badge) internal view returns (bool) {
        if (!seer.hasBadge(subject, badge)) return false;
        uint256 expiry = seer.badgeExpiry(subject, badge);
        return expiry == 0 || expiry > block.timestamp;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // MENTORSHIP FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════

    function setMentorConfig(uint16 minScore, uint16 maxMentees) external onlyDAO {
        require(minScore >= 5000 && minScore <= 10000, "SOCIAL: mentor min out of range");
        require(maxMentees >= 1 && maxMentees <= 200, "SOCIAL: mentor max out of range");
        minScoreToMentor = minScore;
        maxMenteesPerMentor = maxMentees;
        emit MentorConfigUpdated(minScore, maxMentees);
    }

    function becomeMentor() external onlyNotPaused {
        require(!mentors[msg.sender], "SOCIAL: already mentor");
        require(seer.getScore(msg.sender) >= minScoreToMentor, "SOCIAL: score too low");
        mentors[msg.sender] = true;
        emit MentorRegistered(msg.sender);
        _logSystem("mentor_registered");
    }

    function revokeMentor(address mentor) external {
        if (msg.sender != mentor) {
            if (msg.sender != seer.dao()) revert SOCIAL_NotDAO();
        }
        mentors[mentor] = false;
        emit MentorRevoked(mentor);
        _logSystem("mentor_revoked");
    }

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

    function removeMentee(address mentee) external {
        address mentor = mentorOf[mentee];
        require(mentor != address(0), "SOCIAL: no mentor");
        if (msg.sender != mentor) {
            if (msg.sender != seer.dao()) revert SOCIAL_NotDAO();
        }
        _removeMentee(mentor, mentee);
    }

    function _removeMentee(address mentor, address mentee) internal {
        address[] storage list = menteesOf[mentor];
        uint256 len = list.length;
        for (uint256 i = 0; i < len; i++) {
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

    function getMentees(address mentor) external view returns (address[] memory) {
        return menteesOf[mentor];
    }

    function getMentorInfo(address subject) external view returns (
        bool isMentorUser,
        address mentor,
        uint16 menteeCount,
        bool hasMentor,
        bool canBecome,
        uint16 minScore,
        uint16 currentScore
    ) {
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

    function requestScoreReview(string calldata reason) external {
        require(bytes(reason).length > 0 && bytes(reason).length <= 500, "SOCIAL: invalid reason length");
        require(scoreDisputes[msg.sender].timestamp == 0 || scoreDisputes[msg.sender].resolved, "SOCIAL: dispute pending");
        
        scoreDisputes[msg.sender] = ScoreDispute({
            requester: msg.sender,
            reason: reason,
            timestamp: uint64(block.timestamp),
            resolved: false,
            approved: false
        });
        
        pendingDisputeCount++;
        
        emit ScoreDisputeRequested(msg.sender, reason);
        _logEv(msg.sender, "score_dispute_requested", 0, reason);
    }
    
    function resolveScoreDispute(address subject, bool approved, int16 adjustment) external onlyDAO {
        ScoreDispute storage dispute = scoreDisputes[subject];
        require(dispute.timestamp > 0, "SOCIAL: no dispute found");
        require(!dispute.resolved, "SOCIAL: already resolved");
        
        dispute.resolved = true;
        dispute.approved = approved;
        
        // Note: Score adjustment must be done via main Seer contract
        // This contract only tracks the dispute status
        
        if (pendingDisputeCount > 0) {
            pendingDisputeCount--;
        }

        emit ScoreDisputeResolved(subject, approved, adjustment);
        _logEv(subject, "score_dispute_resolved", approved ? 1 : 0, "");
    }

    function fileAppeal(string calldata reason) external {
        require(bytes(reason).length > 0 && bytes(reason).length <= 500, "SOCIAL: invalid reason length");
        Appeal storage existing = appeals[msg.sender];
        require(existing.timestamp == 0 || existing.resolved, "SOCIAL: appeal pending");

        appeals[msg.sender] = Appeal({
            requester: msg.sender,
            reason: reason,
            timestamp: uint64(block.timestamp),
            resolved: false,
            approved: false,
            resolution: ""
        });

        pendingAppealCount++;
        emit AppealFiled(msg.sender, reason);
        _logEv(msg.sender, "appeal_filed", 0, reason);
    }

    function resolveAppeal(address subject, bool approved, string calldata resolution) external onlyDAO {
        Appeal storage appeal = appeals[subject];
        require(appeal.timestamp > 0, "SOCIAL: no appeal");
        require(!appeal.resolved, "SOCIAL: appeal resolved");

        appeal.resolved = true;
        appeal.approved = approved;
        appeal.resolution = resolution;

        if (pendingAppealCount > 0) {
            pendingAppealCount--;
        }

        emit AppealResolved(subject, approved, resolution);
        _logEv(subject, "appeal_resolved", 0, resolution);
    }

    function getDisputeInfo(address subject) external view returns (
        bool hasDispute,
        bool disputeResolved,
        bool disputeApproved,
        uint64 disputeTimestamp,
        string memory disputeReason
    ) {
        ScoreDispute storage d = scoreDisputes[subject];
        hasDispute = d.timestamp > 0;
        disputeResolved = d.resolved;
        disputeApproved = d.approved;
        disputeTimestamp = d.timestamp;
        disputeReason = d.reason;
    }

    function getAppealInfo(address subject) external view returns (
        bool hasAppeal,
        bool appealResolved,
        bool appealApproved,
        uint64 appealTimestamp,
        string memory appealReason,
        string memory appealResolution
    ) {
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

    function _logEv(address who, string memory action, uint256 amt, string memory note) internal {
        address ledgerAddr = seer.ledger();
        if (ledgerAddr != address(0)) {
            try IProofLedgerSocial(ledgerAddr).logEvent(who, action, amt, note) {} catch {}
        }
    }

    function _logSystem(string memory action) internal {
        address ledgerAddr = seer.ledger();
        if (ledgerAddr != address(0)) {
            try IProofLedgerSocial(ledgerAddr).logSystemEvent(address(this), action, msg.sender) {} catch {}
        }
    }
}
