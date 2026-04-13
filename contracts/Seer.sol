// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

// ProofLedger (and the TRUST_NotDAO / TRUST_Zero errors) live in ProofLedger.sol.
import "./ProofLedger.sol";
import "./SharedInterfaces.sol";

/// ────────────────────────── Interfaces

interface IVaultHub_Trust { function vaultOf(address owner) external view returns (address); }
interface ITokenLike_Trust { function balanceOf(address) external view returns (uint256); }

interface ISeerSocial { function calculateEndorsementBonus(address subject) external view returns (uint256); }
interface ISeerAutonomous { function onScoreChange(address subject, uint16 oldScore, uint16 newScore) external; }
interface ISeerPolicyGuard { function consume(bytes4 selector, uint8 pclass) external; }
interface IProofScoreBurnRouterSync { function updateScore(address user) external; }
// ISeerSocialOps: callers should use SeerSocial contract directly

/// ────────────────────────── Errors (Seer-specific; TRUST_NotDAO / TRUST_Zero from ProofLedger.sol)

error TRUST_NotOperator();
error TRUST_Bounds();
error TRUST_AlreadySet();
error TRUST_NotSet();
error TRUST_Paused();
error TRUST_Disabled();
error TRUST_Limit();
error TRUST_InvalidState();

/// @notice Interface for on-chain score sources (decentralized scoring)
interface IScoreSource {
    /// @return score The score contribution from this source (0-1000)
    /// @return weight The weight of this source (0-100, represents %)
    function getScoreContribution(address subject) external view returns (uint16 score, uint8 weight);
}

/// ────────────────────────── Seer (ProofScore engine)
/// @dev I-05 Note: Cross-contract integration tests for the Seer→BurnRouter→VFIDEToken
///      transfer path are critical. Interface mismatches in this call chain would silently
///      break fee calculations. See __tests__/contracts/ for unit coverage.
/// @dev I-15 Note: This contract approaches the 24KB deployment limit. If adding features,
///      consider extracting view-only helpers to SeerView.sol.

contract Seer is ReentrancyGuard {
    enum PolicyClass { Critical, Important, Operational }

    event LedgerSet(address ledger);
    event HubSet(address vaultHub);
    event DAOSet(address indexed oldDAO, address indexed newDAO);
    event ScoreSet(address indexed subject, uint16 oldScore, uint16 newScore, string reason);
    event ScoreReasonCode(address indexed subject, uint16 indexed reasonCode, int16 delta, address indexed actor);
    event ThresholdsSet(uint16 low, uint16 high, uint16 minForGov, uint16 minForMerchant);
    event ScoreSourceAdded(address indexed source, string name, uint8 weight);
    event ScoreSourceRemoved(address indexed source);
    event DecentralizationUpdated(uint8 daoWeight, uint8 onChainWeight);
    event OperatorSet(address indexed operator, bool authorized);
    event DecayApplied(address indexed subject, uint16 oldScore, uint16 newScore, uint256 inactiveDays);
    event Paused(bool isPaused);
    // Endorsement/mentorship events emitted by SeerSocial directly
    event SeerSocialSet(address indexed seerSocial);
    event SeerAutonomousSet(address indexed seerAutonomous);
    event BurnRouterSet(address indexed burnRouter);
    event PolicyGuardSet(address indexed oldGuard, address indexed newGuard);
    event PolicyVersionUpdated(bytes32 indexed policyHash, string policyURI, address indexed updatedBy);
    event DAOChangeProposed(address indexed newDAO, uint64 effectiveAt);
    event DAOChangeCancelled();
    event ScoreCacheTTLSet(uint64 oldTTL, uint64 newTTL);

    address public dao;
    address public pendingDAO;
    uint64 public pendingDAOAt;
    uint64 public constant DAO_CHANGE_DELAY = 48 hours;
    ProofLedger public ledger;
    IVaultHub_Trust public vaultHub;
    
    // Reference to SeerSocial extension for endorsement bonus calculation
    address public seerSocial;
    
    // Reference to SeerAutonomous for automatic enforcement cascading
    address public seerAutonomous;
    address public burnRouter;
    address public policyGuard;

    // Canonical policy publication metadata for Seer governance.
    bytes32 public policyVersionHash;
    string public policyVersionURI;
    string private constant LOG_ACTION = "s";
    bytes4 private constant SEL_SET_DECAY_CONFIG = bytes4(keccak256("setDecayConfig(bool,uint64,uint16)"));
    bytes4 private constant SEL_SET_THRESHOLDS = bytes4(keccak256("setThresholds(uint16,uint16,uint16,uint16)"));
    bytes4 private constant SEL_SET_DECENTRALIZATION_WEIGHTS = bytes4(keccak256("setDecentralizationWeights(uint8,uint8)"));
    bytes4 private constant SEL_SET_POLICY_VERSION = bytes4(keccak256("setPolicyVersion(bytes32,string)"));
    bytes4 private constant SEL_SET_OPERATOR_LIMITS = bytes4(keccak256("setOperatorLimits(uint16,uint16)"));

    // 0 == uninitialized → treated as NEUTRAL = 5000 (50% on 0-10000 scale)
    mapping(address => uint16) private _score;

    mapping(address => bool) private _deltaInProgress;
    
    // Badge system for VFIDEBadgeNFT integration
    mapping(address => mapping(bytes32 => bool)) public hasBadge;
    mapping(address => mapping(bytes32 => uint256)) public badgeExpiry;

    bytes32 private constant BADGE_PIONEER = 0xa03d1a4a2c4366d3db0c7243a29eef9c5e849fe7328823e0b7288dab59d52310;
    bytes32 private constant BADGE_FOUNDING_MEMBER = 0xcd25a284806e0931bbfbd59e48ca09094f95cc8a54899ac7cf670a7bc084e4c8;
    bytes32 private constant BADGE_EARLY_TESTER = 0x0320a6eadcaf07ad703766ce2aae1e5a2302fd7b9236ecdacdc6089d556ee661;
    bytes32 private constant BADGE_ACTIVE_TRADER = 0xfe3c33b66e28f14b3d890787766ee667031d474e01f41afd2282c6ddd242b134;
    bytes32 private constant BADGE_GOVERNANCE_VOTER = 0x1b4e571958fba4ea5c92407500c44c03a913f7a3c4f5746fc318ba401831b4e5;
    bytes32 private constant BADGE_POWER_USER = 0xa96fb0ea3366184fa9ef274bb2b523bb1410c5597f5b73e284bcc8d9c27caf81;
    bytes32 private constant BADGE_TRUSTED_ENDORSER = 0xf4f1880c72d8dbafc9805eb1c4bcefcb30af90b0ae932e0f050c81b491125857;
    bytes32 private constant BADGE_COMMUNITY_BUILDER = 0xfe29986656bd77a1f0da32c9315bed40455567f6060bea388c123d4bafff845a;
    bytes32 private constant BADGE_VERIFIED_MERCHANT = 0xc4f6113bf43fb59dba21ffee106d9126a16fd7ef738a99e9f98f3366a7bcd628;
    bytes32 private constant BADGE_ELITE_MERCHANT = 0xde4df86a0cfbc1ca19c1967d53b4f9d906c2f3e5f0b5637ff74d60111ad48d74;
    bytes32 private constant BADGE_ELITE_ACHIEVER = 0xe426caaf9f537d800bdc663bd466690f26963dfd7bb0ed1ed5f323a945377dfc;
    bytes32 private constant BADGE_FRAUD_HUNTER = 0x22d441acdd22f4ae7f00407a46293dd53140dc9fa6beeef35e22cb018b264344;
    bytes32 private constant BADGE_GUARDIAN = 0x8b5b16d04624687fcf0d0228f19993c9157c1ed07b41d8d430fd9100eb099fe8;
    bytes32 private constant BADGE_CLEAN_RECORD = 0x8f1a39279a10a884ddf0b6a95d0e46f341a5809f447de8f39f0c29e43a914272;
    bytes32 private constant BADGE_CONTRIBUTOR = 0xa0bb1af1c90aa52ed052b92714ff0087008cc720049bf1af77cca2600b31e80c;
    bytes32 private constant BADGE_EDUCATOR = 0x9f56690334c710be9812966692e10c040bde4927265518b422c82505f65961ec;
    bytes32 private constant BADGE_HEADHUNTER = 0x2dc8346db034c7eff3ea2652cae6a78f72280626c9d475257c4476e92e18e9df;
    bytes32 private constant BADGE_DAILY_CHAMPION        = 0xd33d23312f0938ef21668aa46fd5bd7b72db718fcdd7e30d1e9db0ea46420720;
    bytes32 private constant BADGE_PEACEMAKER            = 0xacf4336c61c8a8031abec411f918f29aa8a8d0d7d07ae250391d186289fb4999;
    bytes32 private constant BADGE_MENTOR                = 0x4ad701a62eb4bddf2c4f992ebf56952b66972847c21daeab6931b6b4aa89a4eb;
    bytes32 private constant BADGE_INSTANT_SETTLEMENT    = 0xe2a717c0595726a19d429ba65a7be318c309e2bbfbe0d178266ba0266404b280;
    bytes32 private constant BADGE_ZERO_DISPUTE          = 0x8cd7ae4080d5a7057c8858e5c9e0a698fbc88b319a304fbaaae0f5c2be242349;
    bytes32 private constant BADGE_REDEMPTION            = 0xf55c3c85690d0abf93de8c24ececede3ee62e529020683594957b8e0c109ace1;
    bytes32 private constant BADGE_CENTURY_ENDORSER      = 0x66071085b8de5ddfb56be1bbf93230fbaa1b5a4a7ed21f7ca2ec8b760127b082;
    bytes32 private constant BADGE_WHALE_SLAYER          = 0x27b035d29cbd235e68f8e722fb80b6f9a31122fb2c3bce79340725e804fc9992;
    bytes32 private constant BADGE_DIVERSIFICATION_MASTER = 0x7c3d6722688d7e04217fd02beb9ee0abaf5dd8c4c65c6ad4846a80aae94ca27d;
    bytes32 private constant BADGE_BUG_BOUNTY            = 0x5c96081090ee4a64cc21b4a34b2247212174b7b9afec075a3d09fd229b01e550;
    bytes32 private constant BADGE_TRANSLATOR            = 0x372cedd1d27b066a923b896eea7904ca9ef57e79d18aa00ae08d276de72c77b1;

    // ═══════════════════════════════════════════════════════════════════════
    // ═══════════════════════════════════════════════════════════════════════
    // ENDORSEMENTS & MENTORSHIP - Delegated to SeerSocial
    // ═══════════════════════════════════════════════════════════════════════
    // All endorsement/mentorship state and operations are handled by the
    // SeerSocial contract. Use seerSocial address to interact directly.
    
    // ═══════════════════════════════════════════════════════════════════════
    // OPERATOR SYSTEM - Allows authorized contracts to call reward/punish
    // ═══════════════════════════════════════════════════════════════════════
    
    mapping(address => bool) public operators;
    bool public paused;
    
    // C-2 FIX: Rate limiting for operators to prevent score inflation attacks
    mapping(address => mapping(address => uint64)) public lastOperatorRewardTime;
    mapping(address => mapping(address => uint16)) public dailyOperatorRewardTotal;
    uint16 public maxDailyOperatorReward = 200; // Max 2% score change per day per operator-subject pair
    uint16 public maxSingleReward = 100; // Max 1% score change per call
    mapping(address => uint64) public operatorGlobalDailyResetTime;
    mapping(address => uint32) public operatorGlobalDailyTotal;
    uint32 public maxDailyOperatorGlobalReward = 50_000; // Max 50k points globally per operator per day
    mapping(address => mapping(address => uint64)) public lastOperatorPunishTime;
    mapping(address => mapping(address => uint16)) public dailyOperatorPunishTotal;
    uint16 public maxDailyOperatorPunish = 200; // Max 2% score reduction per day per operator-subject pair

        // F-15 FIX: Cross-operator per-subject daily cap to prevent coordinated operator abuse
        mapping(address => uint64) public subjectGlobalRewardResetTime;
        mapping(address => uint32) public subjectGlobalRewardTotal;
        mapping(address => uint64) public subjectGlobalPunishResetTime;
        mapping(address => uint32) public subjectGlobalPunishTotal;
        uint32 public maxDailySubjectDelta = 300; // Max 3% per day from ALL operators combined
        /// F-16 FIX: Limit the maximum score delta any single DAO setScore() call can make
        // H-5 FIX: Reduced from 2000 (20%) to 500 (5%) to limit DAO manipulation velocity
        uint16 public maxDAOScoreChange = 500; // Max 5% change per call
        
        // S-04 FIX: Rate limit DAO score changes to prevent rapid cascading manipulation
        // H-5 FIX: Increased cooldown from 1 hour to 4 hours
        mapping(address => uint64) public lastDAOScoreChange;
        uint64 public constant DAO_SCORE_COOLDOWN = 4 hours;
    
    // ═══════════════════════════════════════════════════════════════════════
    // SCORE HISTORY - Track score changes for analytics and dispute resolution
    // ═══════════════════════════════════════════════════════════════════════
    
    struct ScoreChange {
        uint16 oldScore;
        uint16 newScore;
        uint64 timestamp;
        bytes32 reasonHash;  // keccak256 of reason string for gas efficiency
    }
    
    mapping(address => ScoreChange[50]) public scoreHistory;
    mapping(address => uint8) public scoreHistoryHead;   // S-05 FIX: circular buffer write pointer
    mapping(address => uint8) public scoreHistoryCount;  // S-05 FIX: number of valid entries (0..50)
    mapping(address => uint64) public lastActivity;  // For decay tracking
    uint8 public constant MAX_HISTORY_PER_USER = 50;  // Cap history storage (fixed-size circular buffer)
    
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

    function setModules(address _ledger, address _hub) external onlyDAO nonReentrant {
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
    function setSeerSocial(address _seerSocial) external onlyDAO nonReentrant {
        if (_seerSocial == address(0)) revert TRUST_Zero();
        seerSocial = _seerSocial;
        emit SeerSocialSet(_seerSocial);
    }
    
    /**
     * @notice Set the SeerAutonomous contract for automatic enforcement
     * @param _seerAutonomous The SeerAutonomous contract address
     */
    function setSeerAutonomous(address _seerAutonomous) external onlyDAO nonReentrant {
        if (_seerAutonomous == address(0)) revert TRUST_Zero();
        seerAutonomous = _seerAutonomous;
        emit SeerAutonomousSet(_seerAutonomous);
    }

    /// @notice Set ProofScoreBurnRouter for score snapshot synchronization
    function setBurnRouter(address _burnRouter) external onlyDAO nonReentrant {
        burnRouter = _burnRouter;
        emit BurnRouterSet(_burnRouter);
    }

    function setPolicyGuard(address _policyGuard) external onlyDAO nonReentrant {
        if (_policyGuard == address(0)) revert TRUST_Zero();
        address oldGuard = policyGuard;
        policyGuard = _policyGuard;
        emit PolicyGuardSet(oldGuard, _policyGuard);
    }
    
    /**
     * @notice Transfer DAO control to a new address (for DAO migration)
     * @param newDAO The new DAO address
     */
    function setDAO(address newDAO) external onlyDAO nonReentrant {
        if (newDAO == address(0)) revert TRUST_Zero();
        pendingDAO = newDAO;
        pendingDAOAt = uint64(block.timestamp) + DAO_CHANGE_DELAY;
        emit DAOChangeProposed(newDAO, pendingDAOAt);
    }

    function applyDAOChange() external onlyDAO nonReentrant {
           if (pendingDAOAt == 0 || block.timestamp < pendingDAOAt) revert TRUST_InvalidState();
        address oldDAO = dao;
        dao = pendingDAO;
        delete pendingDAO;
        delete pendingDAOAt;
        emit DAOSet(oldDAO, dao);
        _logSystem();
    }

    function cancelDAOChange() external onlyDAO nonReentrant {
        if (pendingDAOAt == 0) revert TRUST_NotSet();
        delete pendingDAO;
        delete pendingDAOAt;
        emit DAOChangeCancelled();
    }
    
    /**
     * @notice Set operator status for an address (allows calling reward/punish)
     * @param operator The address to authorize/deauthorize
     * @param authorized True to authorize, false to revoke
     */
    function setOperator(address operator, bool authorized) external onlyDAO nonReentrant {
        if (operator == address(0)) revert TRUST_Zero();
        operators[operator] = authorized;
        emit OperatorSet(operator, authorized);
        _logSystem();
    }
    
    /**
     * @notice Emergency pause/unpause score modifications
     * @param _paused True to pause, false to unpause
     */
    function setPaused(bool _paused) external onlyDAO nonReentrant {
        paused = _paused;
        emit Paused(_paused);
        _logSystem();
    }
    
    /**
     * @notice Configure score decay parameters
     * @param enabled Whether decay is enabled
     * @param startDays Days of inactivity before decay begins
     * @param perMonth Score points lost per month toward neutral
     */
    function setDecayConfig(bool enabled, uint64 startDays, uint16 perMonth) external onlyDAO nonReentrant {
        if (startDays < 30) revert TRUST_Bounds();
        if (perMonth > 500) revert TRUST_Bounds();
        decayEnabled = enabled;
        decayStartDays = startDays;
        decayPerMonth = perMonth;
        _consumePolicyChange(SEL_SET_DECAY_CONFIG, PolicyClass.Important);
        _logSystem();
    }

    function setThresholds(uint16 low, uint16 high, uint16 minGov, uint16 minMerch) external onlyDAO nonReentrant {
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
        _logSystem();
        _consumePolicyChange(SEL_SET_THRESHOLDS, PolicyClass.Critical);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                    DECENTRALIZED SCORE SOURCE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════
    
    uint256 public constant MAX_SCORE_SOURCES = 50; // I-11: Cap to prevent gas amplification in transfer path

    /**
     * @notice Add an on-chain score source
     * @param source Address of contract implementing IScoreSource
     * @param name Human-readable name for the source
     * @param weight Weight of this source (0-100)
     */
    function addScoreSource(address source, string calldata name, uint8 weight) external onlyDAO nonReentrant {
        if (source == address(0)) revert TRUST_Zero();
        if (weight > 100) revert TRUST_Bounds();
        if (scoreSourceIndex[source] != 0) revert TRUST_AlreadySet();
        if (scoreSources.length >= MAX_SCORE_SOURCES) revert TRUST_Limit();
        
        scoreSources.push(ScoreSourceInfo({
            source: source,
            name: name,
            weight: weight,
            active: true
        }));
        scoreSourceIndex[source] = scoreSources.length; // 1-indexed
        
        emit ScoreSourceAdded(source, name, weight);
        _logSystem();
    }
    
    /**
     * @notice Remove an on-chain score source
     */
    function removeScoreSource(address source) external onlyDAO nonReentrant {
        uint256 idx = scoreSourceIndex[source];
        if (idx == 0) revert TRUST_NotSet();
        
        scoreSources[idx - 1].active = false;
        scoreSourceIndex[source] = 0;
        
        emit ScoreSourceRemoved(source);
        _logSystem();
    }
    
    /**
     * @notice Set the balance between DAO-set and on-chain scores
     * @param daoWeight Weight for DAO-set scores (0-100)
     * @param onChainWeight Weight for on-chain sources (0-100)
     */
    function setDecentralizationWeights(uint8 daoWeight, uint8 onChainWeight) external onlyDAO nonReentrant {
        if (daoWeight + onChainWeight != 100) revert TRUST_Bounds();
        daoScoreWeight = daoWeight;
        onChainScoreWeight = onChainWeight;
        emit DecentralizationUpdated(daoWeight, onChainWeight);
        _logSystem();
        _consumePolicyChange(SEL_SET_DECENTRALIZATION_WEIGHTS, PolicyClass.Important);
    }

    /**
     * @notice Publish canonical Seer policy version metadata.
     * @param policyHash Cryptographic hash of policy content/version package.
     * @param policyURI URI to human-readable policy artifact.
     */
    function setPolicyVersion(bytes32 policyHash, string calldata policyURI) external onlyDAO nonReentrant {
        if (policyHash == bytes32(0)) revert TRUST_Bounds();
        if (bytes(policyURI).length == 0 || bytes(policyURI).length > 512) revert TRUST_Bounds();

        policyVersionHash = policyHash;
        policyVersionURI = policyURI;

        emit PolicyVersionUpdated(policyHash, policyURI, msg.sender);
        _logSystem();
        _consumePolicyChange(SEL_SET_POLICY_VERSION, PolicyClass.Operational);
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

    // ═══ Score cache to avoid gas amplification on transfers ═══
    // When onChainScoreWeight > 0, getScore() iterates external source contracts.
    // This cache lets callers (VFIDEToken transfers) use getCachedScore() for a
    // bounded-gas read, while refreshScoreCache() updates the cache off-path.
    mapping(address => uint16) public cachedScore;
    mapping(address => uint64) public cachedScoreTimestamp;
    uint64 public scoreCacheTTL = 1 hours; // Cache validity window

    function setScoreCacheTTL(uint64 ttl) external onlyDAO nonReentrant {
        if (ttl < 5 minutes || ttl > 1 days) revert TRUST_Bounds();
        uint64 oldTTL = scoreCacheTTL;
        scoreCacheTTL = ttl;
        emit ScoreCacheTTLSet(oldTTL, ttl);
    }

    /// @notice Returns cached score if fresh, otherwise falls back to full calculation.
    ///         Use this in gas-sensitive paths (transfers).
    function getCachedScore(address subject) public view returns (uint16) {
        if (onChainScoreWeight == 0) {
            return getScore(subject); // No external calls when weight=0
        }
        uint64 ts = cachedScoreTimestamp[subject];
        if (ts > 0 && block.timestamp - ts <= scoreCacheTTL) {
            return cachedScore[subject];
        }
        // Fallback to full calculation (first-time or stale)
        return getScore(subject);
    }

    /// @notice Refresh the score cache for a user (callable by anyone, pays gas)
    function refreshScoreCache(address subject) external nonReentrant {
        uint16 score = getScore(subject);
        cachedScore[subject] = score;
        cachedScoreTimestamp[subject] = uint64(block.timestamp);
    }

    /// Returns current ProofScore combining DAO-set and on-chain sources
    function getScore(address subject) public view returns (uint16) {
        uint16 daoScore = _score[subject];
        
        // If no DAO-set score, use automated calculation (preserves original behavior)
        if (daoScore < MIN_SCORE) {
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

    /// @notice Best-effort historical score lookup using the bounded score history ring buffer.
    function getScoreAt(address subject, uint64 timestamp) external view returns (uint16) {
        uint8 count = scoreHistoryCount[subject];
        if (count == 0) {
            // C-3 FIX: Return deterministic automated score instead of live getScore() which
            // can include DAO operator overrides, allowing vote-weight manipulation for
            // users with no score history.
            return calculateAutomatedScore(subject);
        }

        uint8 head = scoreHistoryHead[subject];
        ScoreChange memory oldest;

        for (uint8 i = 0; i < count; i++) {
            uint8 idx = uint8((uint256(head) + MAX_HISTORY_PER_USER - 1 - i) % MAX_HISTORY_PER_USER);
            ScoreChange memory change = scoreHistory[subject][idx];
            oldest = change;

            if (change.timestamp <= timestamp) {
                return change.newScore;
            }
        }

        return oldest.oldScore;
    }
    
    /**
     * @notice Calculate score from on-chain sources only
     */
    // Intentional: score aggregation queries independent external scoring modules per source.
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
    // Intentional: automated score composes optional module reads in a bounded control flow.
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
        bytes32[28] memory ids;
        ids[0]  = BADGE_PIONEER;              ids[1]  = BADGE_FOUNDING_MEMBER;
        ids[2]  = BADGE_EARLY_TESTER;         ids[3]  = BADGE_ACTIVE_TRADER;
        ids[4]  = BADGE_GOVERNANCE_VOTER;     ids[5]  = BADGE_POWER_USER;
        ids[6]  = BADGE_TRUSTED_ENDORSER;     ids[7]  = BADGE_COMMUNITY_BUILDER;
        ids[8]  = BADGE_VERIFIED_MERCHANT;    ids[9]  = BADGE_ELITE_MERCHANT;
        ids[10] = BADGE_ELITE_ACHIEVER;       ids[11] = BADGE_FRAUD_HUNTER;
        ids[12] = BADGE_GUARDIAN;             ids[13] = BADGE_CLEAN_RECORD;
        ids[14] = BADGE_CONTRIBUTOR;          ids[15] = BADGE_EDUCATOR;
        ids[16] = BADGE_HEADHUNTER;           ids[17] = BADGE_DAILY_CHAMPION;
        ids[18] = BADGE_PEACEMAKER;           ids[19] = BADGE_MENTOR;
        ids[20] = BADGE_INSTANT_SETTLEMENT;   ids[21] = BADGE_ZERO_DISPUTE;
        ids[22] = BADGE_REDEMPTION;           ids[23] = BADGE_CENTURY_ENDORSER;
        ids[24] = BADGE_WHALE_SLAYER;         ids[25] = BADGE_DIVERSIFICATION_MASTER;
        ids[26] = BADGE_BUG_BOUNTY;           ids[27] = BADGE_TRANSLATOR;
        uint16[28] memory pts;
        pts[0]=30;  pts[1]=50;  pts[2]=25;  pts[3]=20;  pts[4]=25;  pts[5]=40;
        pts[6]=30;  pts[7]=35;  pts[8]=40;  pts[9]=60;  pts[10]=50; pts[11]=50;
        pts[12]=40; pts[13]=20; pts[14]=40; pts[15]=30; pts[16]=35; pts[17]=15;
        pts[18]=25; pts[19]=30; pts[20]=20; pts[21]=25; pts[22]=30; pts[23]=35;
        pts[24]=25; pts[25]=30; pts[26]=50; pts[27]=25;
        for (uint256 i = 0; i < 28;) {
            if (_checkActiveBadge(subject, ids[i])) bonus += pts[i];
            unchecked { ++i; }
        }
    }

    // Intentional: social bonus retrieval delegates to configured social module.
    function _calculateEndorsementBonus(address subject) internal view returns (uint256 bonus) {
        address social = seerSocial;
        if (social == address(0)) return 0;
        try ISeerSocial(social).calculateEndorsementBonus(subject) returns (uint256 socialBonus) {
            return socialBonus;
        } catch {
            return 0;
        }
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
    function setScore(address subject, uint16 newScore, string calldata reason) external onlyDAO nonReentrant {
        if (subject == address(0)) revert TRUST_Zero();
        if (newScore > MAX_SCORE) revert TRUST_Bounds();
        // S-04 FIX: Enforce per-subject cooldown on DAO score changes (max 1 per hour)
        if (block.timestamp < lastDAOScoreChange[subject] + DAO_SCORE_COOLDOWN) revert TRUST_InvalidState();
        uint16 old = getScore(subject);
        uint16 delta = old > newScore ? old - newScore : newScore - old;
        // F-16 FIX: Cap the maximum change per setScore() call to prevent instant trust manipulation
        if (delta > maxDAOScoreChange) revert TRUST_Bounds();
        _score[subject] = newScore;
        lastDAOScoreChange[subject] = uint64(block.timestamp);
        _syncBurnRouterScore(subject);
        emit ScoreSet(subject, old, newScore, reason);
        emit ScoreReasonCode(subject, 500, int16(newScore) - int16(old), msg.sender);
        _logEv(subject, newScore, reason);
    }


    /// Light-weight behavior hooks (can be called by authorized modules).
    function reward(address subject, uint16 delta, string calldata reason) external onlyOperator onlyNotPaused nonReentrant {
        // C-2 FIX: Rate limit operator rewards to prevent score inflation
        if (delta > maxSingleReward) revert TRUST_Bounds();
        
        if (operatorGlobalDailyResetTime[msg.sender] == 0 ||
            block.timestamp >= uint256(operatorGlobalDailyResetTime[msg.sender]) + 1 days) {
            operatorGlobalDailyResetTime[msg.sender] = uint64(block.timestamp);
            operatorGlobalDailyTotal[msg.sender] = 0;
        }
        if (uint256(operatorGlobalDailyTotal[msg.sender]) + delta > maxDailyOperatorGlobalReward) revert TRUST_Limit();
        operatorGlobalDailyTotal[msg.sender] += delta;

        // Reset subject-specific counters if entering a new 24h window
        uint64 windowStart = lastOperatorRewardTime[msg.sender][subject];
        if (windowStart == 0 || block.timestamp >= windowStart + 1 days) {
            lastOperatorRewardTime[msg.sender][subject] = uint64(block.timestamp);
            dailyOperatorRewardTotal[msg.sender][subject] = 0;
        }
        
        // Check daily limit per subject
        if (dailyOperatorRewardTotal[msg.sender][subject] + delta > maxDailyOperatorReward) revert TRUST_Limit();
        
        dailyOperatorRewardTotal[msg.sender][subject] += delta;
        // F-15 FIX: Cross-operator per-subject daily reward cap
        if (subjectGlobalRewardResetTime[subject] == 0 ||
            block.timestamp >= uint256(subjectGlobalRewardResetTime[subject]) + 1 days) {
            subjectGlobalRewardResetTime[subject] = uint64(block.timestamp);
            subjectGlobalRewardTotal[subject] = 0;
        }
        if (uint256(subjectGlobalRewardTotal[subject]) + delta > maxDailySubjectDelta) revert TRUST_Limit();
        subjectGlobalRewardTotal[subject] += delta;
        _delta(subject, int256(uint256(delta)), reason, 501);
    }

    function punish(address subject, uint16 delta, string calldata reason) external onlyOperator onlyNotPaused nonReentrant {
        // C-2 FIX: Rate limit punishments too
        if (delta > maxSingleReward) revert TRUST_Bounds();
        
        if (operatorGlobalDailyResetTime[msg.sender] == 0 ||
            block.timestamp >= uint256(operatorGlobalDailyResetTime[msg.sender]) + 1 days) {
            operatorGlobalDailyResetTime[msg.sender] = uint64(block.timestamp);
            operatorGlobalDailyTotal[msg.sender] = 0;
        }
        if (uint256(operatorGlobalDailyTotal[msg.sender]) + delta > maxDailyOperatorGlobalReward) revert TRUST_Limit();
        operatorGlobalDailyTotal[msg.sender] += delta;

        // Reset subject-specific counters if entering a new 24h window
        uint64 windowStart = lastOperatorPunishTime[msg.sender][subject];
        if (windowStart == 0 || block.timestamp >= windowStart + 1 days) {
            lastOperatorPunishTime[msg.sender][subject] = uint64(block.timestamp);
            dailyOperatorPunishTotal[msg.sender][subject] = 0;
        }
        
        if (dailyOperatorPunishTotal[msg.sender][subject] + delta > maxDailyOperatorPunish) revert TRUST_Limit();
        
        dailyOperatorPunishTotal[msg.sender][subject] += delta;
        // F-15 FIX: Cross-operator per-subject daily punish cap
        if (subjectGlobalPunishResetTime[subject] == 0 ||
            block.timestamp >= uint256(subjectGlobalPunishResetTime[subject]) + 1 days) {
            subjectGlobalPunishResetTime[subject] = uint64(block.timestamp);
            subjectGlobalPunishTotal[subject] = 0;
        }
        if (uint256(subjectGlobalPunishTotal[subject]) + delta > maxDailySubjectDelta) revert TRUST_Limit();
        subjectGlobalPunishTotal[subject] += delta;
        _delta(subject, -int256(uint256(delta)), reason, 502);
    }
    
    /// @notice DAO can set operator rate limits
    function setOperatorLimits(uint16 _maxSingle, uint16 _maxDaily, uint32 _maxGlobal) external onlyDAO nonReentrant {
        if (_maxSingle > 500) revert TRUST_Bounds(); // Max 5% per call
        if (_maxDaily > 1000) revert TRUST_Bounds(); // Max 10% per day per subject
        if (_maxGlobal < _maxDaily) revert TRUST_Bounds(); // Global must be >= per-subject
        maxSingleReward = _maxSingle;
        maxDailyOperatorReward = _maxDaily;
        maxDailyOperatorGlobalReward = _maxGlobal;
        _consumePolicyChange(SEL_SET_OPERATOR_LIMITS, PolicyClass.Important);
        _logSystem();
    }

    function _delta(address subject, int256 d, string calldata reason, uint16 reasonCode) internal {
        if (_deltaInProgress[subject]) revert TRUST_InvalidState();
        _deltaInProgress[subject] = true;

        // with on-chain score sources that may call back to Seer
        uint16 cur = _score[subject];
        int256 next = int256(uint256(cur)) + d;
        if (next < int256(uint256(MIN_SCORE))) next = int256(uint256(MIN_SCORE));
        if (next > int256(uint256(MAX_SCORE))) next = int256(uint256(MAX_SCORE));
        // forge-lint: disable-next-line(unsafe-typecast)
        // Safe: next is clamped between MIN_SCORE (10) and MAX_SCORE (10000)
        uint16 newScore = uint16(uint256(next));
        _score[subject] = newScore;
        _syncBurnRouterScore(subject);
        
        // Record in history (capped to prevent unbounded growth)
        _recordHistory(subject, cur, newScore, reason);
        
        // Update last activity timestamp
        lastActivity[subject] = uint64(block.timestamp);
        
        emit ScoreSet(subject, cur, newScore, reason);
        emit ScoreReasonCode(subject, reasonCode, int16(newScore) - int16(cur), msg.sender);
        _logEv(subject, uint256(int256(d < 0 ? -d : d)), reason);
        
        // CASCADE: Notify SeerAutonomous for automatic enforcement
        if (seerAutonomous != address(0)) {
            try ISeerAutonomous(seerAutonomous).onScoreChange(subject, cur, newScore) {} catch {}
        }

        _deltaInProgress[subject] = false;
    }
    
    function _recordHistory(address subject, uint16 oldScore, uint16 newScore, string calldata reason) internal {
        // S-05 FIX: Use circular buffer (O(1)) instead of O(n) array shift
        uint8 head = scoreHistoryHead[subject];
        scoreHistory[subject][head] = ScoreChange({
            oldScore: oldScore,
            newScore: newScore,
            timestamp: uint64(block.timestamp),
            reasonHash: keccak256(bytes(reason))
        });
        scoreHistoryHead[subject] = uint8((uint256(head) + 1) % MAX_HISTORY_PER_USER);
        uint8 count = scoreHistoryCount[subject];
        if (count < MAX_HISTORY_PER_USER) {
            scoreHistoryCount[subject] = count + 1;
        }
    }

    function _syncBurnRouterScore(address subject) internal {
        address router = burnRouter;
        if (router != address(0)) {
            try IProofScoreBurnRouterSync(router).updateScore(subject) {} catch {}
        }
    }

    function _logSystem() internal {
        address L = address(ledger);
        if (L != address(0)) { try ProofLedger(L).logSystemEvent(address(this), LOG_ACTION, msg.sender) {} catch {} }
    }

    function _consumePolicyChange(bytes4 selector, PolicyClass pclass) internal {
        address guard = policyGuard;
        if (guard == address(0)) revert TRUST_NotSet();
        ISeerPolicyGuard(guard).consume(selector, uint8(pclass));
    }

    function _logEv(address who, uint256 amount, string memory note) internal {
        address L = address(ledger);
        if (L != address(0)) { try ProofLedger(L).logEvent(who, LOG_ACTION, amount, note) {} catch {} }
    }
    
    /// @notice Set or clear a badge for a user (DAO-only)
    /// @param subject The user address
    /// @param badge The badge ID
    /// @param active True to grant, false to revoke
    /// @param expiry Expiration timestamp (0 = permanent)
    function setBadge(address subject, bytes32 badge, bool active, uint256 expiry) external onlyDAO nonReentrant {
        if (subject == address(0)) revert TRUST_Zero();
        if (active && expiry > 0 && expiry <= block.timestamp) revert TRUST_Bounds();
        hasBadge[subject][badge] = active;
        if (active && expiry > 0) {
            badgeExpiry[subject][badge] = expiry;
        } else if (!active) {
            badgeExpiry[subject][badge] = 0;
        }
        _logEv(subject, uint256(badge), "");
    }
    
    /// @notice Check if a badge is valid (not expired)
    function isBadgeValid(address subject, bytes32 badge) external view returns (bool) {
        if (!hasBadge[subject][badge]) return false;
        uint256 exp = badgeExpiry[subject][badge];
        return exp == 0 || exp > block.timestamp;
    }
    
    /// @notice Batch set badges for gas efficiency
    /// @param subjects Array of user addresses
    /// @param badge The badge ID to set for all subjects
    /// @param active True to grant, false to revoke
    /// @param expiry Expiration timestamp (0 = permanent)
    function setBadgeBatch(address[] calldata subjects, bytes32 badge, bool active, uint256 expiry) external onlyDAO nonReentrant {
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
        _logEv(address(this), len, "");
    }

    // ═══════════════════════════════════════════════════════════════════════
    //         ENDORSEMENTS & MENTORSHIP → SeerSocial contract directly
    // ═══════════════════════════════════════════════════════════════════════
    // Endorsement/mentorship operations removed from Seer to reduce bytecode.
    // Callers should interact with the SeerSocial contract directly via
    // the seerSocial address. Endorsement bonus is still composed into
    // calculateAutomatedScore() via ISeerSocial.calculateEndorsementBonus().

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

    event ScoreDisputeRequested(address indexed subject, string reason);
    event ScoreDisputeResolved(address indexed subject, bool approved, int256 adjustment);
    
    /**
     * @notice Request a review of your ProofScore
     * @param reason Explanation for why you believe your score is incorrect
     * @dev DAO will review and can adjust score if warranted
     */
    function requestScoreReview(string calldata reason) external nonReentrant {
        if (bytes(reason).length == 0 || bytes(reason).length > 500) revert TRUST_Bounds();
        if (scoreDisputes[msg.sender].timestamp > 0 && !scoreDisputes[msg.sender].resolved) revert TRUST_AlreadySet();
        
        scoreDisputes[msg.sender] = ScoreDispute({
            requester: msg.sender,
            reason: reason,
            timestamp: uint64(block.timestamp),
            resolved: false,
            approved: false
        });
        
        pendingDisputeCount++;
        
        emit ScoreDisputeRequested(msg.sender, reason);
        _logEv(msg.sender, 0, reason);
    }
    
    /**
     * @notice Resolve a score dispute (DAO only)
     * @param subject The user whose dispute is being resolved
     * @param approved Whether the dispute is approved
     * @param adjustment Score adjustment (positive or negative)
     */
    function resolveScoreDispute(address subject, bool approved, int16 adjustment) external onlyDAO nonReentrant {
        ScoreDispute storage dispute = scoreDisputes[subject];
        if (dispute.timestamp == 0) revert TRUST_NotSet();
        if (dispute.resolved) revert TRUST_AlreadySet();
        
        dispute.resolved = true;
        dispute.approved = approved;
        
        if (approved && adjustment != 0) {
            // Apply against DAO baseline score to avoid double-counting weighted on-chain score.
            uint16 cur = _score[subject];
            int256 next = int256(uint256(cur)) + int256(adjustment);
            if (next < int256(uint256(MIN_SCORE))) next = int256(uint256(MIN_SCORE));
            if (next > int256(uint256(MAX_SCORE))) next = int256(uint256(MAX_SCORE));
            _score[subject] = uint16(uint256(next));
            _syncBurnRouterScore(subject);
            emit ScoreSet(subject, cur, _score[subject], "disp_ok");
            emit ScoreReasonCode(subject, 503, int16(_score[subject]) - int16(cur), msg.sender);
        }
        
        if (pendingDisputeCount > 0) {
            pendingDisputeCount--;
        }

        emit ScoreDisputeResolved(subject, approved, adjustment);
        _logEv(subject, approved ? 1 : 0, "");
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
        if (daoSetScore < MIN_SCORE) {
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
        uint16 rawScore = _score[subject];
        if (rawScore < MIN_SCORE) {
            rawScore = calculateAutomatedScore(subject);
        }
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
        decayAmount = uint16((decayDays * uint64(decayPerMonth)) / 30);
        
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
    function applyDecay(address subject) external onlyNotPaused nonReentrant {
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
            _syncBurnRouterScore(subject);
            lastActivity[subject] = uint64(block.timestamp);  // Reset decay timer
            
            emit DecayApplied(subject, oldScore, adjustedScore, daysInactive);
            _logEv(subject, decayAmount, "ina");
        }
    }
    
    /**
     * @notice Batch apply decay to multiple users (keeper function)
     * @param subjects Array of users to apply decay to
     */
    function applyDecayBatch(address[] calldata subjects) external onlyNotPaused nonReentrant {
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
                _syncBurnRouterScore(subject);
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
        // S-05 FIX: Read from circular buffer in chronological order
        count = scoreHistoryCount[subject];
        uint256 returnCount = count > 10 ? 10 : count;
        recentChanges = new ScoreChange[](returnCount);
        
        uint8 head = scoreHistoryHead[subject];
        // Walk backwards from the most-recent slot
        for (uint256 i = 0; i < returnCount; i++) {
            uint8 idx = uint8((uint256(head) + MAX_HISTORY_PER_USER - 1 - i) % MAX_HISTORY_PER_USER);
            recentChanges[returnCount - 1 - i] = scoreHistory[subject][idx];
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
        uint8 count = scoreHistoryCount[subject];
        uint8 head = scoreHistoryHead[subject];
        
        // S-05 FIX: Search circular buffer from newest to oldest
        for (uint8 i = 0; i < count; i++) {
            uint8 idx = uint8((uint256(head) + MAX_HISTORY_PER_USER - 1 - uint256(i)) % MAX_HISTORY_PER_USER);
            if (scoreHistory[subject][idx].reasonHash == targetHash) {
                return (true, scoreHistory[subject][idx].timestamp);
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
        historyCount = scoreHistoryCount[subject]; // S-05 FIX: use circular buffer count
        hasPendingDispute = scoreDisputes[subject].timestamp > 0 && !scoreDisputes[subject].resolved;
        isOperator = operators[subject];
    }
}

/// ────────────────────────── ProofScoreBurnRouterPlus
contract ProofScoreBurnRouterPlus {
    event SeerSet(address indexed seer);
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
    uint256 private _reentrancyLock;

    modifier onlyDAO() {
        _checkDAO();
        _;
    }

    modifier nonReentrantPSBRP() {
        require(_reentrancyLock == 0, "Reentrancy");
        _reentrancyLock = 1;
        _;
        _reentrancyLock = 0;
    }

    function _checkDAO() internal view {
        if (msg.sender != dao) revert TRUST_NotDAO();
    }

    constructor(address _dao, address _seer, address _treasury) {
        if (_dao == address(0)) revert TRUST_Zero();
        if (_treasury == address(0)) revert TRUST_Zero();
        dao = _dao;
        if (_seer != address(0)) seer = Seer(_seer);
        treasury = _treasury;
    }

    function setModules(address _seer, address _treasury) external onlyDAO nonReentrantPSBRP {
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
    ) external onlyDAO nonReentrantPSBRP {
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
     * Computes dynamic bps from a subject's ProofScore.
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
