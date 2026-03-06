// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * VFIDETrust.sol
 * - ProofLedger: immutable event log (behavioral signals for Seer).
 * - Seer: ProofScore engine (0..10000), neutral default 5000, DAO/Auto updates (10x precision).
 * - ProofScoreBurnRouterPlus: computes burn/treasury/reward basis points from score.
 *
 * Notes:
 * - No external token wiring required yet (we won't touch VFIDEToken).
 * - Security (PanicGuard/GuardianLock) will be provided in VFIDESecurity.sol.
 * - DAO is the only privileged role; later this DAO will be your Governance Hub.
 * - Social features (endorsements, mentorship, appeals) are handled by SeerSocial extension.
 */

/// ────────────────────────── Interfaces
interface IVaultHub_Trust { function vaultOf(address owner) external view returns (address); }
interface ITokenLike_Trust { function balanceOf(address) external view returns (uint256); }
interface ISecurityHub_Trust { function isLocked(address vault) external view returns (bool); }
interface ISeerSocial { function calculateEndorsementBonus(address subject) external view returns (uint256); }
interface ISeerAutonomous { function onScoreChange(address subject, uint16 oldScore, uint16 newScore) external; }
interface ISeerAutonomousRead { function getViolationScore(address subject) external view returns (uint16); }

/// ────────────────────────── Errors
error TRUST_NotDAO();
error TRUST_NotOperator();
error TRUST_Zero();
error TRUST_Bounds();
error TRUST_AlreadySet();
error TRUST_NotSet();
error TRUST_Paused();
error TRUST_Disabled();
error TRUST_Limit();
error TRUST_InvalidState();
error TRUST_InvalidEndorse();
error TRUST_EndorseLimit();
error TRUST_EndorseExists();

/// ────────────────────────── ProofLedger
contract ProofLedger {
    event SystemEvent(address indexed who, string action, address indexed by);
    event EventLog(address indexed who, string action, uint256 amount, string note);
    event TransferLog(address indexed from, address indexed to, uint256 amount, string context);

    address public dao;

    modifier onlyDAO() { _checkDAOPL(); _; }
    function _checkDAOPL() internal view { if (msg.sender != dao) revert TRUST_NotDAO(); }

    constructor(address _dao) {
        if (_dao == address(0)) revert TRUST_Zero();
        dao = _dao;
    }

    function setDAO(address _dao) external onlyDAO {
        if (_dao == address(0)) revert TRUST_Zero();
        dao = _dao;
    }

    // best-effort logs from other modules
    function logSystemEvent(address who, string calldata action, address by) external {
        emit SystemEvent(who, action, by);
    }

    function logEvent(address who, string calldata action, uint256 amount, string calldata note) external {
        emit EventLog(who, action, amount, note);
    }

    function logTransfer(address from, address to, uint256 amount, string calldata context) external {
        emit TransferLog(from, to, amount, context);
    }
}

/// ────────────────────────── Seer (ProofScore)

/// @notice Interface for on-chain score sources (decentralized scoring)
interface IScoreSource {
    /// @return score The score contribution from this source (0-1000)
    /// @return weight The weight of this source (0-100, represents %)
    function getScoreContribution(address subject) external view returns (uint16 score, uint8 weight);
}

contract Seer {
    event LedgerSet(address ledger);
    event HubSet(address vaultHub);
    event DAOSet(address indexed oldDAO, address indexed newDAO);
    event ScoreSet(address indexed subject, uint16 oldScore, uint16 newScore, string reason);
    event ThresholdsSet(uint16 low, uint16 high, uint16 minForGov, uint16 minForMerchant);
    event ScoreSourceAdded(address indexed source, string name, uint8 weight);
    event ScoreSourceRemoved(address indexed source);
    event DecentralizationUpdated(uint8 daoWeight, uint8 onChainWeight);
    event OperatorSet(address indexed operator, bool authorized);
    event DecayApplied(address indexed subject, uint16 oldScore, uint16 newScore, uint256 inactiveDays);
    event Paused(bool isPaused);
    event UserEndorsed(address indexed endorser, address indexed subject, uint16 weight, uint64 expiry, string reason);
    event MentorRegistered(address indexed mentor);
    event MentorRevoked(address indexed mentor);
    event MenteeSponsored(address indexed mentor, address indexed mentee);
    event MenteeRemoved(address indexed mentor, address indexed mentee);
    event MentorConfigUpdated(uint16 minScore, uint16 maxMentees);
    event AppealFiled(address indexed subject, string reason);
    event AppealResolved(address indexed subject, bool approved, string resolution);
    event SeerSocialSet(address indexed seerSocial);
    event SeerAutonomousSet(address indexed seerAutonomous);

    address public dao;
    ProofLedger public ledger;
    IVaultHub_Trust public vaultHub;
    
    // Reference to SeerSocial extension for endorsement bonus calculation
    address public seerSocial;
    
    // Reference to SeerAutonomous for automatic enforcement cascading
    address public seerAutonomous;

    // 0 == uninitialized → treated as NEUTRAL = 5000 (50% on 0-10000 scale)
    mapping(address => uint16) private _score;
    
    // Badge system for VFIDEBadgeNFT integration
    mapping(address => mapping(bytes32 => bool)) public hasBadge;
    mapping(address => mapping(bytes32 => uint256)) public badgeExpiry;

    bytes32 private constant BADGE_PIONEER = keccak256("PIONEER");
    bytes32 private constant BADGE_GENESIS_PRESALE = keccak256("GENESIS_PRESALE");
    bytes32 private constant BADGE_FOUNDING_MEMBER = keccak256("FOUNDING_MEMBER");
    bytes32 private constant BADGE_EARLY_TESTER = keccak256("EARLY_TESTER");
    bytes32 private constant BADGE_ACTIVE_TRADER = keccak256("ACTIVE_TRADER");
    bytes32 private constant BADGE_GOVERNANCE_VOTER = keccak256("GOVERNANCE_VOTER");
    bytes32 private constant BADGE_POWER_USER = keccak256("POWER_USER");
    bytes32 private constant BADGE_TRUSTED_ENDORSER = keccak256("TRUSTED_ENDORSER");
    bytes32 private constant BADGE_COMMUNITY_BUILDER = keccak256("COMMUNITY_BUILDER");
    bytes32 private constant BADGE_VERIFIED_MERCHANT = keccak256("VERIFIED_MERCHANT");
    bytes32 private constant BADGE_ELITE_MERCHANT = keccak256("ELITE_MERCHANT");
    bytes32 private constant BADGE_ELITE_ACHIEVER = keccak256("ELITE_ACHIEVER");
    bytes32 private constant BADGE_FRAUD_HUNTER = keccak256("FRAUD_HUNTER");
    bytes32 private constant BADGE_GUARDIAN = keccak256("GUARDIAN");
    bytes32 private constant BADGE_CLEAN_RECORD = keccak256("CLEAN_RECORD");
    bytes32 private constant BADGE_CONTRIBUTOR = keccak256("CONTRIBUTOR");
    bytes32 private constant BADGE_EDUCATOR = keccak256("EDUCATOR");

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
    // OPERATOR SYSTEM - Allows authorized contracts to call reward/punish
    // ═══════════════════════════════════════════════════════════════════════
    
    mapping(address => bool) public operators;
    bool public paused;
    
    // C-2 FIX: Rate limiting for operators to prevent score inflation attacks
    mapping(address => mapping(address => uint64)) public lastOperatorRewardTime;
    mapping(address => mapping(address => uint16)) public dailyOperatorRewardTotal;
    uint16 public maxDailyOperatorReward = 200; // Max 2% score change per day per operator
    uint16 public maxSingleReward = 100; // Max 1% score change per call
    
    // ═══════════════════════════════════════════════════════════════════════
    // SCORE HISTORY - Track score changes for analytics and dispute resolution
    // ═══════════════════════════════════════════════════════════════════════
    
    struct ScoreChange {
        uint16 oldScore;
        uint16 newScore;
        uint64 timestamp;
        bytes32 reasonHash;  // keccak256 of reason string for gas efficiency
    }
    
    mapping(address => ScoreChange[]) public scoreHistory;
    mapping(address => uint64) public lastActivity;  // For decay tracking
    uint8 public constant MAX_HISTORY_PER_USER = 50;  // Cap history storage
    
    // ═══════════════════════════════════════════════════════════════════════
    // SCORE DECAY - Inactive users slowly drift toward neutral
    // ═══════════════════════════════════════════════════════════════════════
    
    bool public decayEnabled = false;  // DAO can enable decay
    uint64 public decayStartDays = 90;  // Days of inactivity before decay starts
    uint16 public decayPerMonth = 100;  // Score points lost per month toward neutral
    
    // ═══════════════════════════════════════════════════════════════════════
    // DECENTRALIZED SCORE SOURCES - On-chain metrics contribute to ProofScore
    // ═══════════════════════════════════════════════════════════════════════
    
    struct ScoreSourceInfo {
        address source;
        string name;
        uint8 weight;   // Weight out of 100
        bool active;
    }
    
    ScoreSourceInfo[] public scoreSources;
    mapping(address => uint256) public scoreSourceIndex; // source => index+1 (0 = not registered)
    
    // How much weight DAO-set scores vs on-chain calculated scores have
    // daoWeight + onChainWeight should = 100
    // Default: 100% DAO (backwards compatible), DAO can increase on-chain weight over time
    uint8 public daoScoreWeight = 100;     // 100% from DAO-set/automated scores
    uint8 public onChainScoreWeight = 0;   // 0% from external on-chain sources (enable via DAO)

    // policy thresholds (DAO-tunable) - 10x scale for better precision
    uint16 public constant MIN_SCORE = 10;
    uint16 public constant MAX_SCORE = 10000;
    uint16 public constant NEUTRAL   = 5000;

    // WHITEPAPER: Low Trust ≤40% (4000), High Trust ≥80% (8000)
    uint16 public lowTrustThreshold   = 4000;   // ≤4000 → max fees (40%)
    uint16 public highTrustThreshold  = 8000;   // ≥8000 → min fees (80%)
    uint16 public minForGovernance    = 5400;   // voting/standing (54%)
    uint16 public minForMerchant      = 5600;   // to remain listed (56%)

    modifier onlyDAO() {
        _checkDAO();
        _;
    }

    function _checkDAO() internal view {
        if (msg.sender != dao) revert TRUST_NotDAO();
    }
    
    modifier onlyOperator() {
        if (msg.sender != dao && !operators[msg.sender]) revert TRUST_NotOperator();
        _;
    }
    
    modifier onlyNotPaused() {
        if (paused) revert TRUST_Paused();
        _;
    }

    constructor(address _dao, address _ledger, address _hub) {
        if (_dao == address(0)) revert TRUST_Zero();
        dao = _dao;
        if (_ledger != address(0)) ledger = ProofLedger(_ledger);
        if (_hub != address(0)) vaultHub = IVaultHub_Trust(_hub);
    }

    function setModules(address _ledger, address _hub) external onlyDAO {
        if (_ledger == address(0) || _hub == address(0)) revert TRUST_Zero();
        ledger = ProofLedger(_ledger);
        vaultHub = IVaultHub_Trust(_hub);
        emit LedgerSet(_ledger);
        emit HubSet(_hub);
    }
    
    /**
     * @notice Set the SeerSocial extension contract for endorsement calculations
     * @param _seerSocial The SeerSocial contract address
     */
    function setSeerSocial(address _seerSocial) external onlyDAO {
        seerSocial = _seerSocial;
        emit SeerSocialSet(_seerSocial);
    }
    
    /**
     * @notice Set the SeerAutonomous contract for automatic enforcement
     * @param _seerAutonomous The SeerAutonomous contract address
     */
    function setSeerAutonomous(address _seerAutonomous) external onlyDAO {
        seerAutonomous = _seerAutonomous;
        emit SeerAutonomousSet(_seerAutonomous);
    }
    
    /**
     * @notice Transfer DAO control to a new address (for DAO migration)
     * @param newDAO The new DAO address
     */
    function setDAO(address newDAO) external onlyDAO {
        if (newDAO == address(0)) revert TRUST_Zero();
        address oldDAO = dao;
        dao = newDAO;
        emit DAOSet(oldDAO, newDAO);
        _logSystem("dao_xfer");
    }
    
    /**
     * @notice Set operator status for an address (allows calling reward/punish)
     * @param operator The address to authorize/deauthorize
     * @param authorized True to authorize, false to revoke
     */
    function setOperator(address operator, bool authorized) external onlyDAO {
        if (operator == address(0)) revert TRUST_Zero();
        operators[operator] = authorized;
        emit OperatorSet(operator, authorized);
        _logSystem(authorized ? "op_add" : "op_rm");
    }
    
    /**
     * @notice Emergency pause/unpause score modifications
     * @param _paused True to pause, false to unpause
     */
    function setPaused(bool _paused) external onlyDAO {
        paused = _paused;
        emit Paused(_paused);
        _logSystem(_paused ? "pause_on" : "pause_off");
    }
    
    /**
     * @notice Configure score decay parameters
     * @param enabled Whether decay is enabled
     * @param startDays Days of inactivity before decay begins
     * @param perMonth Score points lost per month toward neutral
     */
    function setDecayConfig(bool enabled, uint64 startDays, uint16 perMonth) external onlyDAO {
        if (startDays < 30) revert TRUST_Bounds();
        if (perMonth > 500) revert TRUST_Bounds();
        decayEnabled = enabled;
        decayStartDays = startDays;
        decayPerMonth = perMonth;
        _logSystem("decay_cfg");
    }

    function setThresholds(uint16 low, uint16 high, uint16 minGov, uint16 minMerch) external onlyDAO {
        if (low > high) revert TRUST_Bounds();
        if (high > MAX_SCORE) revert TRUST_Bounds();
        // M-1 FIX: Add minimum value constraints to prevent threshold manipulation
        if (low < 1000) revert TRUST_Bounds(); // At least 10%
        if (high > 9500) revert TRUST_Bounds(); // At most 95%
        if (minGov < 3000) revert TRUST_Bounds(); // At least 30%
        if (minMerch < 3000) revert TRUST_Bounds(); // At least 30%
        lowTrustThreshold  = low;
        highTrustThreshold = high;
        minForGovernance   = minGov;
        minForMerchant     = minMerch;
        emit ThresholdsSet(low, high, minGov, minMerch);
        _logSystem("thr_set");
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                    DECENTRALIZED SCORE SOURCE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Add an on-chain score source
     * @param source Address of contract implementing IScoreSource
     * @param name Human-readable name for the source
     * @param weight Weight of this source (0-100)
     */
    function addScoreSource(address source, string calldata name, uint8 weight) external onlyDAO {
        if (source == address(0)) revert TRUST_Zero();
        if (weight > 100) revert TRUST_Bounds();
        if (scoreSourceIndex[source] != 0) revert TRUST_AlreadySet();
        
        scoreSources.push(ScoreSourceInfo({
            source: source,
            name: name,
            weight: weight,
            active: true
        }));
        scoreSourceIndex[source] = scoreSources.length; // 1-indexed
        
        emit ScoreSourceAdded(source, name, weight);
        _logSystem("src_add");
    }
    
    /**
     * @notice Remove an on-chain score source
     */
    function removeScoreSource(address source) external onlyDAO {
        uint256 idx = scoreSourceIndex[source];
        if (idx == 0) revert TRUST_NotSet();
        
        scoreSources[idx - 1].active = false;
        scoreSourceIndex[source] = 0;
        
        emit ScoreSourceRemoved(source);
        _logSystem("src_rm");
    }
    
    /**
     * @notice Set the balance between DAO-set and on-chain scores
     * @param daoWeight Weight for DAO-set scores (0-100)
     * @param onChainWeight Weight for on-chain sources (0-100)
     */
    function setDecentralizationWeights(uint8 daoWeight, uint8 onChainWeight) external onlyDAO {
        if (daoWeight + onChainWeight != 100) revert TRUST_Bounds();
        daoScoreWeight = daoWeight;
        onChainScoreWeight = onChainWeight;
        emit DecentralizationUpdated(daoWeight, onChainWeight);
        _logSystem("wgt_set");
    }
    
    /**
     * @notice Get number of active score sources
     */
    function getScoreSourceCount() external view returns (uint256 total, uint256 active) {
        total = scoreSources.length;
        for (uint256 i = 0; i < total; i++) {
            if (scoreSources[i].active) active++;
        }
    }

    /// Returns current ProofScore combining DAO-set and on-chain sources
    function getScore(address subject) public view returns (uint16) {
        uint16 daoScore = _score[subject];
        
        // If no DAO-set score, use automated calculation (preserves original behavior)
        if (daoScore == 0) {
            daoScore = calculateAutomatedScore(subject);
        }
        
        // If no on-chain sources weight, just return DAO/automated score
        if (onChainScoreWeight == 0) {
            return daoScore;
        }
        
        // Calculate on-chain score from external sources
        uint16 onChainScore = calculateOnChainScore(subject);
        
        // Weighted average of DAO-set and on-chain sources
        uint256 combined = (uint256(daoScore) * daoScoreWeight + uint256(onChainScore) * onChainScoreWeight) / 100;
        
        // Clamp
        if (combined > MAX_SCORE) combined = MAX_SCORE;
        if (combined < MIN_SCORE) combined = MIN_SCORE;
        
        return uint16(combined);
    }
    
    /**
     * @notice Calculate score from on-chain sources only
     */
    function calculateOnChainScore(address subject) public view returns (uint16) {
        if (subject == address(0)) return NEUTRAL;
        
        uint256 totalWeight = 0;
        uint256 weightedScore = 0;
        
        // Aggregate from registered sources
        for (uint256 i = 0; i < scoreSources.length; i++) {
            if (!scoreSources[i].active) continue;
            
            try IScoreSource(scoreSources[i].source).getScoreContribution(subject) returns (uint16 score, uint8 weight) {
                if (weight > 0 && score <= 1000) {
                    // Score sources return 0-1000, we need 0-10000
                    uint256 scaledScore = uint256(score) * 10;
                    weightedScore += scaledScore * weight;
                    totalWeight += weight;
                }
            } catch {
                // Source failed, skip it
            }
        }
        
        // Add automated score as a source
        uint16 automatedScore = calculateAutomatedScore(subject);
        uint256 automatedWeight = 100 - totalWeight; // Remaining weight goes to automated
        if (automatedWeight > 0) {
            weightedScore += uint256(automatedScore) * automatedWeight;
            totalWeight += automatedWeight;
        }
        
        if (totalWeight == 0) return NEUTRAL;
        
        uint256 finalScore = weightedScore / totalWeight;
        if (finalScore > MAX_SCORE) finalScore = MAX_SCORE;
        if (finalScore < MIN_SCORE) finalScore = MIN_SCORE;
        
        return uint16(finalScore);
    }

    /// Automated ProofScore calculation based on behavioral metrics
    function calculateAutomatedScore(address subject) public view returns (uint16) {
        if (subject == address(0)) return NEUTRAL;
        
        uint256 score = NEUTRAL;
        
        // Vault existence bonus (+500, 10x scale)
        if (address(vaultHub) != address(0)) {
            address vault = vaultHub.vaultOf(subject);
            if (vault != address(0)) {
                score += 500;
            }
        }
        
        // Badge bonuses - badges grant ProofScore boosts
        // These are additive and create a visible reputation ladder
        score += _calculateBadgeBonus(subject);

        // Social endorsements - time-limited boosts that decay automatically
        score += _calculateEndorsementBonus(subject);
        
        // Clamp to valid range
        if (score > MAX_SCORE) score = MAX_SCORE;
        
        // forge-lint: disable-next-line(unsafe-typecast)
        // Safe: score is clamped to MAX_SCORE (10000) which fits in uint16
        return uint16(score);
    }
    
    /**
     * @notice Calculate ProofScore bonus from active badges
     * @param subject The user address
     * @return bonus Total score bonus from all active badges
     */
    function _calculateBadgeBonus(address subject) internal view returns (uint256 bonus) {
        // Import BadgeRegistry constants to check each badge
        // For gas efficiency, we only check badges that contribute to score
        
        // Pioneer badges (permanent)
        if (_checkActiveBadge(subject, BADGE_PIONEER)) {
            bonus += 30;
        }
        if (_checkActiveBadge(subject, BADGE_GENESIS_PRESALE)) {
            bonus += 40;
        }
        if (_checkActiveBadge(subject, BADGE_FOUNDING_MEMBER)) {
            bonus += 50;
        }
        if (_checkActiveBadge(subject, BADGE_EARLY_TESTER)) {
            bonus += 25;
        }
        
        // Activity badges (renewable)
        if (_checkActiveBadge(subject, BADGE_ACTIVE_TRADER)) {
            bonus += 20;
        }
        if (_checkActiveBadge(subject, BADGE_GOVERNANCE_VOTER)) {
            bonus += 25;
        }
        if (_checkActiveBadge(subject, BADGE_POWER_USER)) {
            bonus += 40;
        }
        
        // Trust badges (permanent/renewable)
        if (_checkActiveBadge(subject, BADGE_TRUSTED_ENDORSER)) {
            bonus += 30;
        }
        if (_checkActiveBadge(subject, BADGE_COMMUNITY_BUILDER)) {
            bonus += 35;
        }
        
        // Merchant badges (renewable)
        if (_checkActiveBadge(subject, BADGE_VERIFIED_MERCHANT)) {
            bonus += 40;
        }
        if (_checkActiveBadge(subject, BADGE_ELITE_MERCHANT)) {
            bonus += 60;
        }
        
        // Achievement badges (permanent)
        if (_checkActiveBadge(subject, BADGE_ELITE_ACHIEVER)) {
            bonus += 50;
        }
        if (_checkActiveBadge(subject, BADGE_FRAUD_HUNTER)) {
            bonus += 50;
        }
        
        // Security badges
        if (_checkActiveBadge(subject, BADGE_GUARDIAN)) {
            bonus += 40;
        }
        if (_checkActiveBadge(subject, BADGE_CLEAN_RECORD)) {
            bonus += 20;
        }
        
        // Contribution badges
        if (_checkActiveBadge(subject, BADGE_CONTRIBUTOR)) {
            bonus += 40;
        }
        if (_checkActiveBadge(subject, BADGE_EDUCATOR)) {
            bonus += 30;
        }
        
        // Note: For gas efficiency, only the most impactful badges are checked here
        // Full badge listing is available in BadgeRegistry
        
        return bonus;
    }

    function _calculateEndorsementBonus(address subject) internal view returns (uint256 bonus) {
        // If SeerSocial is set, delegate to it for endorsement bonus calculation
        if (seerSocial != address(0)) {
            try ISeerSocial(seerSocial).calculateEndorsementBonus(subject) returns (uint256 socialBonus) {
                return socialBonus;
            } catch {
                // Fall through to local calculation if SeerSocial fails
            }
        }
        
        // Fallback: calculate from local state (for backward compatibility)
        address[] storage endorsers = endorsersOf[subject];
        uint256 len = endorsers.length;
        uint256 subjectPenalty = 0;
        if (seerAutonomous != address(0)) {
            try ISeerAutonomousRead(seerAutonomous).getViolationScore(subject) returns (uint16 vscore) {
                subjectPenalty = vscore; // scale in loop below
            } catch {}
        }
        for (uint256 i = 0; i < len; i++) {
            Endorsement storage e = endorsements[subject][endorsers[i]];
            if (e.weight > 0 && e.expiry > block.timestamp) {
                uint256 weight = e.weight;
                // Down-weight endorsements from violators
                if (seerAutonomous != address(0)) {
                    try ISeerAutonomousRead(seerAutonomous).getViolationScore(endorsers[i]) returns (uint16 endorserV) {
                        if (endorserV > 0) {
                            uint256 damp = endorserV > 500 ? 500 : endorserV; // cap
                            weight = weight * (1000 - damp) / 1000; // reduce up to 50%
                        }
                    } catch {}
                }
                bonus += weight;
            }
        }
        // Apply subject-level penalty (small dampener if subject has violations)
        if (subjectPenalty > 0 && bonus > 0) {
            uint256 dampSubject = subjectPenalty > 800 ? 800 : subjectPenalty; // cap
            bonus = bonus * (1000 - dampSubject) / 1000;
        }
        if (bonus > endorsementBonusCap) {
            bonus = endorsementBonusCap;
        }
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
                continue; // re-check swapped index
            }
            i++;
        }
        endorsementsReceived[subject] = uint16(endorsers.length);
    }
    
    /**
     * @notice Check if badge is active (exists and not expired)
     * @param subject The user address
     * @param badge The badge ID
     * @return active True if badge is active
     */
    function _checkActiveBadge(address subject, bytes32 badge) internal view returns (bool) {
        if (!hasBadge[subject][badge]) return false;
        uint256 expiry = badgeExpiry[subject][badge];
        return expiry == 0 || expiry > block.timestamp;
    }

    /// DAO can directly set scores for migrations or rectifications.
    function setScore(address subject, uint16 newScore, string calldata reason) external onlyDAO {
        if (subject == address(0)) revert TRUST_Zero();
        if (newScore > MAX_SCORE) revert TRUST_Bounds();
        uint16 old = getScore(subject);
        _score[subject] = newScore;
        emit ScoreSet(subject, old, newScore, reason);
        _logEv(subject, "scr_set", newScore, reason);
    }

    /// Light-weight behavior hooks (can be called by authorized modules).
    function reward(address subject, uint16 delta, string calldata reason) external onlyOperator onlyNotPaused {
        // C-2 FIX: Rate limit operator rewards to prevent score inflation
        if (delta > maxSingleReward) revert TRUST_Bounds();
        
        // Reset subject-specific counters if entering a new 24h window
        uint64 windowStart = lastOperatorRewardTime[msg.sender][subject];
        if (windowStart == 0 || block.timestamp >= windowStart + 1 days) {
            lastOperatorRewardTime[msg.sender][subject] = uint64(block.timestamp);
            dailyOperatorRewardTotal[msg.sender][subject] = 0;
        }
        
        // Check daily limit per subject
        if (dailyOperatorRewardTotal[msg.sender][subject] + delta > maxDailyOperatorReward) revert TRUST_Limit();
        
        dailyOperatorRewardTotal[msg.sender][subject] += delta;
        _delta(subject, int256(uint256(delta)), reason);
    }

    function punish(address subject, uint16 delta, string calldata reason) external onlyOperator onlyNotPaused {
        // C-2 FIX: Rate limit punishments too
        if (delta > maxSingleReward) revert TRUST_Bounds();
        _delta(subject, -int256(uint256(delta)), reason);
    }
    
    /// @notice DAO can set operator rate limits
    function setOperatorLimits(uint16 _maxSingle, uint16 _maxDaily) external onlyDAO {
        if (_maxSingle > 500) revert TRUST_Bounds(); // Max 5% per call
        if (_maxDaily > 1000) revert TRUST_Bounds(); // Max 10% per day
        maxSingleReward = _maxSingle;
        maxDailyOperatorReward = _maxDaily;
        _logSystem("op_lim");
    }

    function _delta(address subject, int256 d, string calldata reason) internal {
        uint16 cur = getScore(subject);
        int256 next = int256(uint256(cur)) + d;
        if (next < int256(uint256(MIN_SCORE))) next = int256(uint256(MIN_SCORE));
        if (next > int256(uint256(MAX_SCORE))) next = int256(uint256(MAX_SCORE));
        // forge-lint: disable-next-line(unsafe-typecast)
        // Safe: next is clamped between MIN_SCORE (10) and MAX_SCORE (10000)
        uint16 newScore = uint16(uint256(next));
        _score[subject] = newScore;
        
        // Record in history (capped to prevent unbounded growth)
        _recordHistory(subject, cur, newScore, reason);
        
        // Update last activity timestamp
        lastActivity[subject] = uint64(block.timestamp);
        
        emit ScoreSet(subject, cur, newScore, reason);
        _logEv(subject, "scr_dlt", uint256(int256(d < 0 ? -d : d)), reason);
        
        // CASCADE: Notify SeerAutonomous for automatic enforcement
        if (seerAutonomous != address(0)) {
            try ISeerAutonomous(seerAutonomous).onScoreChange(subject, cur, newScore) {} catch {}
        }
    }
    
    function _recordHistory(address subject, uint16 oldScore, uint16 newScore, string calldata reason) internal {
        ScoreChange[] storage history = scoreHistory[subject];
        
        // Cap history to prevent unbounded storage
        if (history.length >= MAX_HISTORY_PER_USER) {
            // Remove oldest entry by shifting
            for (uint256 i = 1; i < history.length; i++) {
                history[i - 1] = history[i];
            }
            history.pop();
        }
        
        history.push(ScoreChange({
            oldScore: oldScore,
            newScore: newScore,
            timestamp: uint64(block.timestamp),
            reasonHash: keccak256(bytes(reason))
        }));
    }

    function _logSystem(string memory action) internal {
        address L = address(ledger);
        if (L != address(0)) { try ProofLedger(L).logSystemEvent(address(this), action, msg.sender) {} catch {} }
    }

    function _logEv(address who, string memory action, uint256 amount, string memory note) internal {
        address L = address(ledger);
        if (L != address(0)) { try ProofLedger(L).logEvent(who, action, amount, note) {} catch {} }
    }
    
    /// @notice Set or clear a badge for a user (DAO-only)
    /// @param subject The user address
    /// @param badge The badge ID
    /// @param active True to grant, false to revoke
    /// @param expiry Expiration timestamp (0 = permanent)
    function setBadge(address subject, bytes32 badge, bool active, uint256 expiry) external onlyDAO {
        if (subject == address(0)) revert TRUST_Zero();
        if (active && expiry > 0 && expiry <= block.timestamp) revert TRUST_Bounds();
        hasBadge[subject][badge] = active;
        if (active && expiry > 0) {
            badgeExpiry[subject][badge] = expiry;
        } else if (!active) {
            badgeExpiry[subject][badge] = 0;
        }
        _logEv(subject, active ? "bdg_on" : "bdg_off", uint256(badge), "");
    }
    
    /// @notice Check if a badge is valid (not expired)
    function isBadgeValid(address subject, bytes32 badge) external view returns (bool) {
        if (!hasBadge[subject][badge]) return false;
        uint256 exp = badgeExpiry[subject][badge];
        return exp == 0 || exp > block.timestamp;
    }
    
    /// @notice L-3 Fix: Batch set badges for gas efficiency
    /// @param subjects Array of user addresses
    /// @param badge The badge ID to set for all subjects
    /// @param active True to grant, false to revoke
    /// @param expiry Expiration timestamp (0 = permanent)
    function setBadgeBatch(address[] calldata subjects, bytes32 badge, bool active, uint256 expiry) external onlyDAO {
        uint256 len = subjects.length;
        if (len == 0 || len > 100) revert TRUST_Bounds();
        if (active && expiry > 0 && expiry <= block.timestamp) revert TRUST_Bounds();
        
        for (uint256 i = 0; i < len; i++) {
            address subject = subjects[i];
            if (subject == address(0)) revert TRUST_Zero();
            hasBadge[subject][badge] = active;
            if (active && expiry > 0) {
                badgeExpiry[subject][badge] = expiry;
            } else if (!active) {
                badgeExpiry[subject][badge] = 0;
            }
        }
        _logEv(address(this), active ? "bdg_b_on" : "bdg_b_off", len, "");
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                         ENDORSEMENTS (SOCIAL)
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
        if (baseValue == 0 || baseValue > 200) revert TRUST_Bounds();
        if (maxPerEndorser < baseValue || maxPerEndorser > 300) revert TRUST_Bounds();
        if (bonusCap < baseValue) revert TRUST_Bounds();
        if (maxPerSubject == 0 || maxPerSubject > 50) revert TRUST_Bounds();
        if (maxGiven == 0 || maxGiven > 200) revert TRUST_Bounds();
        if (validity < 7 days || validity > 365 days) revert TRUST_Bounds();
        if (cooldown < 10 minutes || cooldown > 7 days) revert TRUST_Bounds();
        if (minScore < MIN_SCORE || minScore > MAX_SCORE) revert TRUST_Bounds();

        endorsementBaseValue = baseValue;
        endorsementMaxPerEndorser = maxPerEndorser;
        endorsementBonusCap = bonusCap;
        maxEndorsersPerSubject = maxPerSubject;
        maxActiveGivenPerUser = maxGiven;
        endorsementValidity = validity;
        endorsementCooldown = cooldown;
        minScoreToEndorse = minScore;
        _logSystem("end_pol");
    }

    function endorse(address subject, string calldata reason) external onlyNotPaused {
        if (subject == address(0) || subject == msg.sender) revert TRUST_InvalidEndorse();
        if (bytes(reason).length > 160) revert TRUST_Bounds();

        // Rate limit endorsers
        if (endorsementCooldown > 0) {
            if (block.timestamp < lastEndorseTime[msg.sender] + endorsementCooldown) revert TRUST_Limit();
        }

        uint16 endorserScore = getScore(msg.sender);
        if (endorserScore < minScoreToEndorse) revert TRUST_EndorseLimit();

        _pruneExpiredEndorsements(subject);

        Endorsement storage existing = endorsements[subject][msg.sender];
        if (existing.expiry > block.timestamp) revert TRUST_EndorseExists();

        uint16 activeReceived = uint16(endorsersOf[subject].length);
        if (activeReceived >= maxEndorsersPerSubject) revert TRUST_EndorseLimit();
        if (endorsementsGiven[msg.sender] >= maxActiveGivenPerUser) revert TRUST_EndorseLimit();

        uint16 weight = endorsementBaseValue;
        if (endorserScore >= highTrustThreshold) weight += 10;
        if (_checkActiveBadge(msg.sender, BADGE_TRUSTED_ENDORSER)) weight += 10;
        if (weight > endorsementMaxPerEndorser) weight = endorsementMaxPerEndorser;

        uint256 currentBonus = _calculateEndorsementBonus(subject);
        if (currentBonus + weight > endorsementBonusCap) revert TRUST_EndorseLimit();

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
        _logEv(subject, "end", weight, reason);
    }

    function pruneEndorsements(address subject) external onlyNotPaused {
        _pruneExpiredEndorsements(subject);
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
        activeBonus = uint16(_calculateEndorsementBonus(subject));
        endorsementsYouGave = endorsementsGiven[subject];
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                             MENTORSHIP
    // ═══════════════════════════════════════════════════════════════════════

    function setMentorConfig(uint16 minScore, uint16 maxMentees) external onlyDAO {
        if (minScore < 5000 || minScore > MAX_SCORE) revert TRUST_Bounds();
        if (maxMentees < 1 || maxMentees > 200) revert TRUST_Bounds();
        minScoreToMentor = minScore;
        maxMenteesPerMentor = maxMentees;
        emit MentorConfigUpdated(minScore, maxMentees);
    }

    function becomeMentor() external onlyNotPaused {
        if (mentors[msg.sender]) revert TRUST_AlreadySet();
        if (getScore(msg.sender) < minScoreToMentor) revert TRUST_Limit();
        mentors[msg.sender] = true;
        emit MentorRegistered(msg.sender);
        _logSystem("mnt_add");
    }

    function revokeMentor(address mentor) external {
        if (msg.sender != mentor) _checkDAO();
        mentors[mentor] = false;
        emit MentorRevoked(mentor);
        _logSystem("mnt_rm");
    }

    function sponsorMentee(address mentee) external onlyNotPaused {
        if (!mentors[msg.sender]) revert TRUST_InvalidState();
        if (mentee == address(0) || mentee == msg.sender) revert TRUST_InvalidEndorse();
        if (mentorOf[mentee] != address(0)) revert TRUST_AlreadySet();
        if (menteesOf[msg.sender].length >= maxMenteesPerMentor) revert TRUST_Limit();
        if (getScore(msg.sender) < minScoreToMentor) revert TRUST_Limit();

        mentorOf[mentee] = msg.sender;
        menteesOf[msg.sender].push(mentee);

        emit MenteeSponsored(msg.sender, mentee);
        _logEv(mentee, "men_add", 0, "");
    }

    function removeMentee(address mentee) external {
        address mentor = mentorOf[mentee];
        if (mentor == address(0)) revert TRUST_NotSet();
        if (msg.sender != mentor) _checkDAO();
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
        _logEv(mentee, "men_rm", 0, "");
    }

    function getMentees(address mentor) external view returns (address[] memory) {
        return menteesOf[mentor];
    }

    function getStoredScore(address subject) external view returns (uint16) {
        return _score[subject];
    }

    function getEndorserCount(address subject) external view returns (uint256) {
        return endorsersOf[subject].length;
    }

    function getEndorserAt(address subject, uint256 index) external view returns (address) {
        return endorsersOf[subject][index];
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                         USABILITY IMPROVEMENTS
    // ═══════════════════════════════════════════════════════════════════════
    
    // Score dispute tracking
    struct ScoreDispute {
        address requester;
        string reason;
        uint64 timestamp;
        bool resolved;
        bool approved;
    }
    
    mapping(address => ScoreDispute) public scoreDisputes;
    uint256 public pendingDisputeCount;

    // Appeals: lightweight channel for contesting flags/decisions outside score disputes
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
    
    event ScoreDisputeRequested(address indexed subject, string reason);
    event ScoreDisputeResolved(address indexed subject, bool approved, int256 adjustment);
    
    /**
     * @notice Request a review of your ProofScore
     * @param reason Explanation for why you believe your score is incorrect
     * @dev DAO will review and can adjust score if warranted
     */
    function requestScoreReview(string calldata reason) external {
        if (bytes(reason).length == 0 || bytes(reason).length > 500) revert TRUST_Bounds();
        if (!(scoreDisputes[msg.sender].timestamp == 0 || scoreDisputes[msg.sender].resolved)) revert TRUST_AlreadySet();
        
        scoreDisputes[msg.sender] = ScoreDispute({
            requester: msg.sender,
            reason: reason,
            timestamp: uint64(block.timestamp),
            resolved: false,
            approved: false
        });
        
        pendingDisputeCount++;
        
        emit ScoreDisputeRequested(msg.sender, reason);
        _logEv(msg.sender, "disp_req", 0, reason);
    }
    
    /**
     * @notice Resolve a score dispute (DAO only)
     * @param subject The user whose dispute is being resolved
     * @param approved Whether the dispute is approved
     * @param adjustment Score adjustment (positive or negative)
     */
    function resolveScoreDispute(address subject, bool approved, int16 adjustment) external onlyDAO {
        ScoreDispute storage dispute = scoreDisputes[subject];
        if (dispute.timestamp == 0) revert TRUST_NotSet();
        if (dispute.resolved) revert TRUST_AlreadySet();
        
        dispute.resolved = true;
        dispute.approved = approved;
        
        if (approved && adjustment != 0) {
            // Apply adjustment directly instead of using _delta which expects calldata
            uint16 cur = getScore(subject);
            int256 next = int256(uint256(cur)) + int256(adjustment);
            if (next < int256(uint256(MIN_SCORE))) next = int256(uint256(MIN_SCORE));
            if (next > int256(uint256(MAX_SCORE))) next = int256(uint256(MAX_SCORE));
            _score[subject] = uint16(uint256(next));
            emit ScoreSet(subject, cur, _score[subject], "disp_ok");
        }
        
        if (pendingDisputeCount > 0) {
            pendingDisputeCount--;
        }

        emit ScoreDisputeResolved(subject, approved, adjustment);
        _logEv(subject, "disp_res", approved ? 1 : 0, "");
    }

    // ───────────────── Appeals (general-purpose)
    function fileAppeal(string calldata reason) external {
        if (bytes(reason).length == 0 || bytes(reason).length > 500) revert TRUST_Bounds();
        Appeal storage existing = appeals[msg.sender];
        if (!(existing.timestamp == 0 || existing.resolved)) revert TRUST_AlreadySet();

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
        _logEv(msg.sender, "apl_req", 0, reason);
    }

    function resolveAppeal(address subject, bool approved, string calldata resolution) external onlyDAO {
        Appeal storage appeal = appeals[subject];
        if (appeal.timestamp == 0) revert TRUST_NotSet();
        if (appeal.resolved) revert TRUST_AlreadySet();

        appeal.resolved = true;
        appeal.approved = approved;
        appeal.resolution = resolution;

        if (pendingAppealCount > 0) {
            pendingAppealCount--;
        }

        emit AppealResolved(subject, approved, resolution);
        _logEv(subject, "apl_res", 0, resolution);
    }
    
    /**
     * @notice Get score breakdown showing component contributions
     * @param subject The user to get breakdown for
     * @return daoSetScore The DAO-set/automated score
     * @return onChainScore The on-chain calculated score
     * @return finalScore The combined final score
     * @return daoWeight Weight of DAO-set score
     * @return onChainWeight Weight of on-chain score
     * @return hasVault Whether user has a vault (contributes +500)
     */
    function getScoreBreakdown(address subject) external view returns (
        uint16 daoSetScore,
        uint16 onChainScore,
        uint16 finalScore,
        uint8 daoWeight,
        uint8 onChainWeight,
        bool hasVault
    ) {
        daoSetScore = _score[subject];
        if (daoSetScore == 0) {
            daoSetScore = calculateAutomatedScore(subject);
        }
        onChainScore = calculateOnChainScore(subject);
        finalScore = getScore(subject);
        daoWeight = daoScoreWeight;
        onChainWeight = onChainScoreWeight;
        hasVault = address(vaultHub) != address(0) && vaultHub.vaultOf(subject) != address(0);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                    SCORE DECAY FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Calculate decay-adjusted score for a user
     * @param subject The user to check
     * @return adjustedScore Score after applying inactivity decay
     * @return daysInactive Number of days since last activity
     * @return decayAmount Amount of decay applied
     */
    function getDecayAdjustedScore(address subject) public view returns (
        uint16 adjustedScore,
        uint64 daysInactive,
        uint16 decayAmount
    ) {
        uint16 rawScore = getScore(subject);
        uint64 lastAct = lastActivity[subject];
        
        // No activity recorded = no decay (new user)
        if (lastAct == 0 || !decayEnabled) {
            return (rawScore, 0, 0);
        }
        
        uint64 elapsed = uint64(block.timestamp) - lastAct;
        daysInactive = elapsed / 1 days;
        
        // No decay if active within grace period
        if (daysInactive < decayStartDays) {
            return (rawScore, daysInactive, 0);
        }
        
        // Calculate decay: (daysInactive - decayStartDays) / 30 * decayPerMonth
        uint64 decayDays = daysInactive - decayStartDays;
        uint64 decayMonths = decayDays / 30;
        decayAmount = uint16(decayMonths * decayPerMonth);
        
        // Decay toward neutral, not below/above
        if (rawScore > NEUTRAL) {
            // High scores decay down toward neutral
            if (decayAmount > rawScore - NEUTRAL) {
                adjustedScore = NEUTRAL;
            } else {
                adjustedScore = rawScore - decayAmount;
            }
        } else if (rawScore < NEUTRAL) {
            // Low scores decay up toward neutral
            if (decayAmount > NEUTRAL - rawScore) {
                adjustedScore = NEUTRAL;
            } else {
                adjustedScore = rawScore + decayAmount;
            }
        } else {
            adjustedScore = NEUTRAL;
        }
    }
    
    /**
     * @notice Apply decay to a user's stored score (callable by anyone, gas refund opportunity)
     * @param subject The user to apply decay to
     */
    function applyDecay(address subject) external onlyNotPaused {
        if (!decayEnabled) revert TRUST_Disabled();
        
        uint64 lastAct = lastActivity[subject];
        if (lastAct == 0) revert TRUST_NotSet();
        
        uint64 elapsed = uint64(block.timestamp) - lastAct;
        uint64 daysInactive = elapsed / 1 days;
        if (daysInactive < decayStartDays) revert TRUST_InvalidState();
        
        (uint16 adjustedScore, , uint16 decayAmount) = getDecayAdjustedScore(subject);
        
        if (decayAmount > 0) {
            uint16 oldScore = _score[subject];
            _score[subject] = adjustedScore;
            lastActivity[subject] = uint64(block.timestamp);  // Reset decay timer
            
            emit DecayApplied(subject, oldScore, adjustedScore, daysInactive);
            _logEv(subject, "decay", decayAmount, "ina");
        }
    }
    
    /**
     * @notice Batch apply decay to multiple users (keeper function)
     * @param subjects Array of users to apply decay to
     */
    function applyDecayBatch(address[] calldata subjects) external onlyNotPaused {
        if (!decayEnabled) revert TRUST_Disabled();
        if (subjects.length == 0 || subjects.length > 50) revert TRUST_Bounds();
        
        for (uint256 i = 0; i < subjects.length; i++) {
            address subject = subjects[i];
            uint64 lastAct = lastActivity[subject];
            if (lastAct == 0) continue;
            
            uint64 elapsed = uint64(block.timestamp) - lastAct;
            uint64 daysInactive = elapsed / 1 days;
            if (daysInactive < decayStartDays) continue;
            
            (uint16 adjustedScore, , uint16 decayAmount) = getDecayAdjustedScore(subject);
            
            if (decayAmount > 0) {
                uint16 oldScore = _score[subject];
                _score[subject] = adjustedScore;
                lastActivity[subject] = uint64(block.timestamp);
                emit DecayApplied(subject, oldScore, adjustedScore, daysInactive);
            }
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                    SCORE HISTORY QUERIES
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get score history for a user
     * @param subject The user to query
     * @return count Number of history entries
     * @return recentChanges Last 10 score changes (or fewer if less history)
     */
    function getScoreHistory(address subject) external view returns (
        uint256 count,
        ScoreChange[] memory recentChanges
    ) {
        ScoreChange[] storage history = scoreHistory[subject];
        count = history.length;
        
        uint256 returnCount = count > 10 ? 10 : count;
        recentChanges = new ScoreChange[](returnCount);
        
        // Return most recent entries
        for (uint256 i = 0; i < returnCount; i++) {
            recentChanges[i] = history[count - returnCount + i];
        }
    }
    
    /**
     * @notice Check if a specific reason was used in recent score changes
     * @param subject The user to check
     * @param reason The reason to search for
     * @return found Whether the reason was found in recent history
     * @return timestamp When the reason was last used (0 if not found)
     */
    function findReasonInHistory(address subject, string calldata reason) external view returns (
        bool found,
        uint64 timestamp
    ) {
        bytes32 targetHash = keccak256(bytes(reason));
        ScoreChange[] storage history = scoreHistory[subject];
        
        // Search from most recent
        for (uint256 i = history.length; i > 0; i--) {
            if (history[i - 1].reasonHash == targetHash) {
                return (true, history[i - 1].timestamp);
            }
        }
        return (false, 0);
    }
    
    /**
     * @notice Get comprehensive user status including decay
     * @param subject The user to check
     */
    function getUserStatus(address subject) external view returns (
        uint16 currentScore,
        uint16 decayAdjustedScore,
        uint64 daysInactive,
        uint64 lastActivityTime,
        uint256 historyCount,
        bool hasPendingDispute,
        bool isOperator
    ) {
        currentScore = getScore(subject);
        (decayAdjustedScore, daysInactive, ) = getDecayAdjustedScore(subject);
        lastActivityTime = lastActivity[subject];
        historyCount = scoreHistory[subject].length;
        hasPendingDispute = scoreDisputes[subject].timestamp > 0 && !scoreDisputes[subject].resolved;
        isOperator = operators[subject];
    }
}

/// ────────────────────────── ProofScoreBurnRouterPlus
contract ProofScoreBurnRouterPlus {
    event SeerSet(address seer);
    event PolicySet(uint16 baseBurnBps, uint16 baseRewardBps, uint16 highBoostBps, uint16 lowPenaltyBps, uint16 maxTotalBps, address treasury);

    address public dao;
    Seer    public seer;

    // base policy (DAO-tunable)
    uint16 public baseBurnBps    = 200;  // 2.00%
    uint16 public baseRewardBps  = 50;   // 0.50% (used by staking/loyalty)
    uint16 public highBoostBps   = 50;   // +0.50% reward for high-trust
    uint16 public lowPenaltyBps  = 150;  // +1.50% extra burn for low-trust
    uint16 public maxTotalBps    = 1000; // 10.00% ceiling for (burn + reward + treasury)
    address public treasury;             // EcoTreasuryVault later

    modifier onlyDAO() {
        _checkDAO();
        _;
    }

    function _checkDAO() internal view {
        if (msg.sender != dao) revert TRUST_NotDAO();
    }

    constructor(address _dao, address _seer, address _treasury) {
        if (_dao == address(0)) revert TRUST_Zero();
        dao = _dao;
        if (_seer != address(0)) seer = Seer(_seer);
        treasury = _treasury;
    }

    function setModules(address _seer, address _treasury) external onlyDAO {
        if (_seer == address(0) || _treasury == address(0)) revert TRUST_Zero();
        seer = Seer(_seer);
        treasury = _treasury;
        emit SeerSet(_seer);
    }

    function setPolicy(
        uint16 _baseBurnBps,
        uint16 _baseRewardBps,
        uint16 _highBoostBps,
        uint16 _lowPenaltyBps,
        uint16 _maxTotalBps,
        address _treasury
    ) external onlyDAO {
        if (_treasury == address(0)) revert TRUST_Zero();
        if (_maxTotalBps == 0 || _maxTotalBps > 4000) revert TRUST_Bounds(); // hard ceiling 40% for safety
        if (_baseBurnBps > _maxTotalBps || _baseRewardBps > _maxTotalBps) revert TRUST_Bounds();
        if (uint256(_baseBurnBps) + _baseRewardBps > _maxTotalBps) revert TRUST_Bounds();
        if (uint256(_baseBurnBps) + _baseRewardBps + _highBoostBps > _maxTotalBps) revert TRUST_Bounds();
        if (uint256(_baseBurnBps) + _baseRewardBps + _lowPenaltyBps > _maxTotalBps) revert TRUST_Bounds();
        baseBurnBps   = _baseBurnBps;
        baseRewardBps = _baseRewardBps;
        highBoostBps  = _highBoostBps;
        lowPenaltyBps = _lowPenaltyBps;
        maxTotalBps   = _maxTotalBps;
        treasury      = _treasury;
        emit PolicySet(baseBurnBps, baseRewardBps, highBoostBps, lowPenaltyBps, maxTotalBps, treasury);
    }

    struct Route { uint16 burnBps; uint16 rewardBps; uint16 treasuryBps; }

    /**
     * Computes dynamic bps from a subject’s ProofScore.
     * - High-trust: reward boosted.
     * - Low-trust: burn penalized.
     * - Ensures sum <= maxTotalBps.
     */
    function routeFor(address subject) public view returns (Route memory r) {
        uint16 s = seer.getScore(subject); // defaults to 500 neutral

        // start from base
        uint256 burn = baseBurnBps;
        uint256 rew  = baseRewardBps;

        // adjust based on thresholds
        if (s >= seer.highTrustThreshold()) {
            rew += highBoostBps;
        } else if (s <= seer.lowTrustThreshold()) {
            burn += lowPenaltyBps;
        }

        // treasury share is whatever remains up to maxTotalBps, but never negative
        uint256 total = burn + rew;
        uint256 treas = total >= maxTotalBps ? 0 : (maxTotalBps - total);

        // forge-lint: disable-next-line(unsafe-typecast)
        // Safe: burn, rew, treas are all <= maxTotalBps (max 1000) which fits in uint16
        r = Route({burnBps: uint16(burn), rewardBps: uint16(rew), treasuryBps: uint16(treas)});
    }
}