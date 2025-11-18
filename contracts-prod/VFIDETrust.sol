// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * VFIDETrust.sol
 * - ProofLedger: immutable event log (behavioral signals for Seer).
 * - Seer: ProofScore engine (0..1000), neutral default 500, DAO/Auto updates.
 * - ProofScoreBurnRouterPlus: computes burn/treasury/sanctum basis points from score.
 * - SanctumRegistry: DAO-approved humanitarian charities (children, healthcare, disaster relief, etc.)
 * - SanctumVault: Accumulates 25% of burn fees, distributes equally to active charities
 *
 * Fee Structure (ProofScore-based):
 * - Score 0 (worst): 10.00% total → 50% burned, 25% ecosystem treasury, 25% SanctumVault
 * - Score 500 (neutral): ~5.10% total → 50% burned, 25% ecosystem treasury, 25% SanctumVault
 * - Score 1000 (perfect): 0.25% total → 50% burned, 25% ecosystem treasury, 25% SanctumVault
 *
 * Ecosystem Treasury Use:
 * - Subsidizes merchant transaction fees ONLY for high-trust merchants (score ≥750)
 *   → High-trust merchants (score ≥750): Treasury pays fees, users pay nothing
 *   → Medium-trust merchants (560-749): No subsidy, users pay score-based fees
 *   → Low-trust merchants (score <560): Removed from ecosystem by DAO
 *   → Merchants pay same dynamic fees as users (score-based: 10%→0.25%)
 *   → Incentivizes merchants to maintain high ProofScore for feeless benefits
 * - Funds development, operations, security audits
 * - Subsidizes gas costs for accessibility
 * - Emergency reserves for system stability
 *
 * Notes:
 * - DAO requires 2/3 majority vote for all governance actions
 * - Security (PanicGuard/GuardianLock) provided in VFIDESecurity.sol
 * - One vault per user (enforced by VaultHub)
 */

/// ────────────────────────── Interfaces
interface IVaultHub_Trust { function vaultOf(address owner) external view returns (address); }
interface ITokenLike_Trust { 
    function balanceOf(address) external view returns (uint256); 
    function transfer(address to, uint256 amount) external returns (bool);
}

/// ────────────────────────── Errors
error TRUST_NotDAO();
error TRUST_Zero();
error TRUST_Bounds();
error TRUST_AlreadySet();
error TRUST_NotSet();
error TRUST_NoApprovedCharities();
error TRUST_NotHumanitarian();

/// ────────────────────────── ProofLedger
contract ProofLedger {
    event SystemEvent(address indexed who, string action, address indexed by);
    event EventLog(address indexed who, string action, uint256 amount, string note);
    event TransferLog(address indexed from, address indexed to, uint256 amount, string context);
    event DAOChanged(address indexed newDAO);
    event ModuleSet(address indexed module, bool enabled);

    address public dao;
    mapping(address => bool) public authorizedModules;  // Only authorized modules can log

    modifier onlyDAO() { if (msg.sender != dao) revert TRUST_NotDAO(); _; }
    modifier onlyAuthorized() { 
        if (msg.sender != dao && !authorizedModules[msg.sender]) revert TRUST_NotDAO(); 
        _; 
    }

    constructor(address _dao) {
        if (_dao == address(0)) revert TRUST_Zero();
        dao = _dao;
    }

    function setModule(address module, bool enabled) external onlyDAO {
        authorizedModules[module] = enabled;
        emit ModuleSet(module, enabled);
    }

    function setDAO(address _dao) external onlyDAO {
        if (_dao == address(0)) revert TRUST_Zero();
        dao = _dao;
        emit DAOChanged(_dao);
    }

    // Only authorized modules can log (prevents spam and manipulation)
    function logSystemEvent(address who, string calldata action, address by) external onlyAuthorized {
        emit SystemEvent(who, action, by);
    }

    function logEvent(address who, string calldata action, uint256 amount, string calldata note) external onlyAuthorized {
        emit EventLog(who, action, amount, note);
    }

    function logTransfer(address from, address to, uint256 amount, string calldata context) external onlyAuthorized {
        emit TransferLog(from, to, amount, context);
    }
}

/// ────────────────────────── Seer (ProofScore)
contract Seer {
    event LedgerSet(address ledger);
    event HubSet(address vaultHub);
    event PersonalScoreSet(address indexed subject, uint16 oldScore, uint16 newScore, string reason);
    event MerchantScoreSet(address indexed merchant, uint16 oldScore, uint16 newScore, string reason);
    event ThresholdsSet(uint16 low, uint16 high, uint16 minForGov, uint16 minForMerchant, uint16 minForSubsidy);
    event DAOChanged(address indexed newDAO);

    address public dao;
    ProofLedger public ledger;
    IVaultHub_Trust public vaultHub;

    // Dual score system: personal vault trust vs merchant business trust
    // Score storage: 0 = uninitialized (treated as NEUTRAL 500), 1+ = actual score + 1
    mapping(address => uint16) private _personalScore;   // Personal vault behavior (payments, recovery, governance)
    mapping(address => uint16) private _merchantScore;   // Merchant business behavior (delivery, disputes, service)

    // policy thresholds (DAO-tunable)
    uint16 public constant MIN_SCORE = 0;
    uint16 public constant MAX_SCORE = 1000;
    uint16 public constant NEUTRAL   = 500;

    // Personal vault thresholds (affect user transaction fees)
    uint16 public lowTrustThreshold   = 350;   // under this → risky (higher fees: 6-10%)
    uint16 public highTrustThreshold  = 700;   // above this → boosted (lower fees: 0.25-3%)
    uint16 public minForGovernance    = 540;   // minimum PERSONAL score for DAO voting/council standing
    
    // Merchant business thresholds (affect merchant listing and subsidies)
    uint16 public minForMerchant      = 560;   // minimum MERCHANT score to remain in ecosystem
    uint16 public minForFeeSubsidy    = 750;   // minimum MERCHANT score for ecosystem fee coverage
                                               // Merchant score ≥750: Treasury pays fees (users pay nothing)
                                               // Merchant score 560-749: No subsidy (users pay fees)
                                               // Merchant score <560: Removed from ecosystem

    modifier onlyDAO() { if (msg.sender != dao) revert TRUST_NotDAO(); _; }

    constructor(address _dao, address _ledger, address _hub) {
        if (_dao == address(0)) revert TRUST_Zero();
        // Validate threshold ordering at deployment
        if (lowTrustThreshold > highTrustThreshold) revert TRUST_Bounds();
        if (highTrustThreshold > MAX_SCORE) revert TRUST_Bounds();
        if (minForMerchant > minForFeeSubsidy) revert TRUST_Bounds();
        if (minForFeeSubsidy > MAX_SCORE) revert TRUST_Bounds();
        dao = _dao;
        if (_ledger != address(0)) ledger = ProofLedger(_ledger);
        if (_hub != address(0)) vaultHub = IVaultHub_Trust(_hub);
    }

    function setDAO(address _dao) external onlyDAO {
        if (_dao == address(0)) revert TRUST_Zero();
        dao = _dao;
    }

    function setModules(address _ledger, address _hub) external onlyDAO {
        if (_ledger == address(0) || _hub == address(0)) revert TRUST_Zero();
        ledger = ProofLedger(_ledger);
        vaultHub = IVaultHub_Trust(_hub);
        emit LedgerSet(_ledger);
        emit HubSet(_hub);
    }

    function setThresholds(uint16 low, uint16 high, uint16 minGov, uint16 minMerch, uint16 minSubsidy) external onlyDAO {
        if (low > high) revert TRUST_Bounds();
        if (high > MAX_SCORE) revert TRUST_Bounds();
        if (minMerch > minSubsidy) revert TRUST_Bounds(); // Fee subsidy threshold must be higher than merchant minimum
        lowTrustThreshold  = low;
        highTrustThreshold = high;
        minForGovernance   = minGov;
        minForMerchant     = minMerch;
        minForFeeSubsidy   = minSubsidy;
        emit ThresholdsSet(low, high, minGov, minMerch, minSubsidy);
        _logSystem("seer_thresholds_set");
    }

    /// Returns personal vault ProofScore; uninitialized = 500 (neutral).
    /// Storage: 0 = uninitialized (return 500), 1-1001 = actual score 0-1000
    /// Used for: transaction fees, governance voting rights
    function getScore(address subject) public view returns (uint16) {
        uint16 stored = _personalScore[subject];
        return stored == 0 ? NEUTRAL : stored - 1;
    }
    
    /// Returns merchant business ProofScore; uninitialized = 500 (neutral).
    /// Used for: merchant listing eligibility, fee subsidy qualification
    function getMerchantScore(address merchant) public view returns (uint16) {
        uint16 stored = _merchantScore[merchant];
        return stored == 0 ? NEUTRAL : stored - 1;
    }

    /// DAO can directly set personal vault scores for migrations or rectifications.
    function setScore(address subject, uint16 newScore, string calldata reason) external onlyDAO {
        if (subject == address(0)) revert TRUST_Zero();
        if (newScore > MAX_SCORE) revert TRUST_Bounds();
        uint16 old = getScore(subject);
        _personalScore[subject] = newScore + 1;  // Store score+1 so 0 = uninitialized
        emit PersonalScoreSet(subject, old, newScore, reason);
        _logEv(subject, "seer_personal_score_set", newScore, reason);
    }
    
    /// DAO can directly set merchant business scores.
    function setMerchantScore(address merchant, uint16 newScore, string calldata reason) external onlyDAO {
        if (merchant == address(0)) revert TRUST_Zero();
        if (newScore > MAX_SCORE) revert TRUST_Bounds();
        uint16 old = getMerchantScore(merchant);
        _merchantScore[merchant] = newScore + 1;  // Store score+1 so 0 = uninitialized
        emit MerchantScoreSet(merchant, old, newScore, reason);
        _logEv(merchant, "seer_merchant_score_set", newScore, reason);
    }

    /// Light-weight behavior hooks for PERSONAL vault scores (can be called by other modules).
    function reward(address subject, uint16 delta, string calldata reason) external onlyDAO {
        _deltaPersonal(subject, int256(uint256(delta)), reason);
    }

    function punish(address subject, uint16 delta, string calldata reason) external onlyDAO {
        _deltaPersonal(subject, -int256(uint256(delta)), reason);
    }
    
    /// Behavior hooks for MERCHANT business scores.
    function rewardMerchant(address merchant, uint16 delta, string calldata reason) external onlyDAO {
        _deltaMerchant(merchant, int256(uint256(delta)), reason);
    }

    function punishMerchant(address merchant, uint16 delta, string calldata reason) external onlyDAO {
        _deltaMerchant(merchant, -int256(uint256(delta)), reason);
    }

    function _deltaPersonal(address subject, int256 d, string calldata reason) internal {
        uint16 cur = getScore(subject);
        int256 next = int256(uint256(cur)) + d;
        if (next < int256(uint256(MIN_SCORE))) next = int256(uint256(MIN_SCORE));
        if (next > int256(uint256(MAX_SCORE))) next = int256(uint256(MAX_SCORE));
        uint16 newScore = uint16(uint256(next));
        _personalScore[subject] = newScore + 1;  // Store score+1 so 0 = uninitialized
        emit PersonalScoreSet(subject, cur, newScore, reason);
        _logEv(subject, "seer_personal_delta", uint256(int256(d < 0 ? -d : d)), reason);
    }
    
    function _deltaMerchant(address merchant, int256 d, string calldata reason) internal {
        uint16 cur = getMerchantScore(merchant);
        int256 next = int256(uint256(cur)) + d;
        if (next < int256(uint256(MIN_SCORE))) next = int256(uint256(MIN_SCORE));
        if (next > int256(uint256(MAX_SCORE))) next = int256(uint256(MAX_SCORE));
        uint16 newScore = uint16(uint256(next));
        _merchantScore[merchant] = newScore + 1;  // Store score+1 so 0 = uninitialized
        emit MerchantScoreSet(merchant, cur, newScore, reason);
        _logEv(merchant, "seer_merchant_delta", uint256(int256(d < 0 ? -d : d)), reason);
    }

    /// @notice Get both personal and merchant scores in one call (gas efficient for UI)
    function getDualScore(address subject) external view returns (uint16 personalScore, uint16 merchantScore) {
        personalScore = getScore(subject);
        merchantScore = getMerchantScore(subject);
    }
    
    /// @notice Batch set personal scores (efficient for DAO mass updates)
    function batchSetPersonalScores(address[] calldata subjects, uint16[] calldata scores, string calldata reason) external onlyDAO {
        if (subjects.length != scores.length) revert TRUST_Bounds();
        for (uint256 i = 0; i < subjects.length; i++) {
            if (subjects[i] == address(0)) revert TRUST_Zero();
            if (scores[i] > MAX_SCORE) revert TRUST_Bounds();
            uint16 old = getScore(subjects[i]);
            _personalScore[subjects[i]] = scores[i] + 1;
            emit PersonalScoreSet(subjects[i], old, scores[i], reason);
        }
    }
    
    /// @notice Batch set merchant scores (efficient for DAO mass merchant reviews)
    function batchSetMerchantScores(address[] calldata merchants, uint16[] calldata scores, string calldata reason) external onlyDAO {
        if (merchants.length != scores.length) revert TRUST_Bounds();
        for (uint256 i = 0; i < merchants.length; i++) {
            if (merchants[i] == address(0)) revert TRUST_Zero();
            if (scores[i] > MAX_SCORE) revert TRUST_Bounds();
            uint16 old = getMerchantScore(merchants[i]);
            _merchantScore[merchants[i]] = scores[i] + 1;
            emit MerchantScoreSet(merchants[i], old, scores[i], reason);
        }
    }

    function _logSystem(string memory action) internal {
        address L = address(ledger);
        if (L != address(0)) { try ProofLedger(L).logSystemEvent(address(this), action, msg.sender) {} catch {} }
    }

    function _logEv(address who, string memory action, uint256 amount, string memory note) internal {
        address L = address(ledger);
        if (L != address(0)) { try ProofLedger(L).logEvent(who, action, amount, note) {} catch {} }
    }
    
    /// @notice Check if merchant qualifies for ecosystem fee subsidy
    /// @return true if MERCHANT BUSINESS score ≥ minForFeeSubsidy (default 750)
    function qualifiesForFeeSubsidy(address merchant) external view returns (bool) {
        return getMerchantScore(merchant) >= minForFeeSubsidy;
    }
    
    /// @notice Check if merchant meets minimum score to remain in ecosystem
    /// @return true if MERCHANT BUSINESS score ≥ minForMerchant (default 560)
    function isMerchantEligible(address merchant) external view returns (bool) {
        return getMerchantScore(merchant) >= minForMerchant;
    }
}

/// ────────────────────────── SanctumRegistry (Humanitarian Charity Approval)
contract SanctumRegistry {
    event CharityApproved(address indexed charity, string name, string category);
    event CharityRevoked(address indexed charity, string reason);
    event CharityFrozen(address indexed charity, string reason);
    event CharityUnfrozen(address indexed charity, string reason);
    event DAOChanged(address indexed newDAO);

    address public dao;
    
    struct Charity {
        string name;           // e.g., "Children's Hospital Network"
        string category;       // e.g., "healthcare", "children", "disaster_relief"
        bool approved;         // DAO approval status
        bool frozen;           // DAO can freeze charity (stops distributions without full revoke)
        uint64 approvedAt;     // Timestamp of approval
        uint64 frozenAt;       // Timestamp when frozen (0 if not frozen)
    }
    
    mapping(address => Charity) public charities;
    address[] public approvedList;  // Active list for iteration
    
    modifier onlyDAO() { if (msg.sender != dao) revert TRUST_NotDAO(); _; }
    
    constructor(address _dao) {
        if (_dao == address(0)) revert TRUST_Zero();
        dao = _dao;
    }
    
    function setDAO(address _dao) external onlyDAO {
        if (_dao == address(0)) revert TRUST_Zero();
        dao = _dao;
        emit DAOChanged(_dao);
    }
    
    /// @notice DAO approves humanitarian charity vault
    /// @param charity Vault address to receive Sanctum funds
    /// @param name Human-readable name (e.g., "Save the Children")
    /// @param category Humanitarian category: "children", "healthcare", "disaster_relief", "education", "food_security"
    /// @dev Only humanitarian causes allowed - NO political, religious, or commercial entities
    function approveCharity(address charity, string calldata name, string calldata category) external onlyDAO {
        if (charity == address(0)) revert TRUST_Zero();
        if (charities[charity].approved) revert TRUST_AlreadySet();
        
        // Validate humanitarian category (prevents political/religious/commercial abuse)
        bytes32 catHash = keccak256(bytes(category));
        bool validCategory = (
            catHash == keccak256("children") ||
            catHash == keccak256("healthcare") ||
            catHash == keccak256("disaster_relief") ||
            catHash == keccak256("education") ||
            catHash == keccak256("food_security") ||
            catHash == keccak256("housing") ||
            catHash == keccak256("clean_water")
        );
        if (!validCategory) revert TRUST_NotHumanitarian();
        
        charities[charity] = Charity({
            name: name,
            category: category,
            approved: true,
            frozen: false,
            approvedAt: uint64(block.timestamp),
            frozenAt: 0
        });
        approvedList.push(charity);
        emit CharityApproved(charity, name, category);
    }
    
    /// @notice DAO revokes charity approval (e.g., if misused or no longer operating)
    function revokeCharity(address charity, string calldata reason) external onlyDAO {
        if (!charities[charity].approved) revert TRUST_NotSet();
        
        charities[charity].approved = false;
        
        // Remove from approved list
        for (uint256 i = 0; i < approvedList.length; i++) {
            if (approvedList[i] == charity) {
                approvedList[i] = approvedList[approvedList.length - 1];
                approvedList.pop();
                break;
            }
        }
        
        emit CharityRevoked(charity, reason);
    }
    
    /// @notice DAO freezes charity (temporarily blocks distributions without full revoke)
    /// @dev Frozen charities stay in approved list but won't receive funds during dispersal
    function freezeCharity(address charity, string calldata reason) external onlyDAO {
        if (!charities[charity].approved) revert TRUST_NotSet();
        if (charities[charity].frozen) revert TRUST_AlreadySet();
        
        charities[charity].frozen = true;
        charities[charity].frozenAt = uint64(block.timestamp);
        emit CharityFrozen(charity, reason);
    }
    
    /// @notice DAO unfreezes charity (resumes distributions)
    function unfreezeCharity(address charity, string calldata reason) external onlyDAO {
        if (!charities[charity].approved) revert TRUST_NotSet();
        if (!charities[charity].frozen) revert TRUST_NotSet();
        
        charities[charity].frozen = false;
        charities[charity].frozenAt = 0;
        emit CharityUnfrozen(charity, reason);
    }
    
    function getApprovedCount() external view returns (uint256) {
        return approvedList.length;
    }
    
    function getApprovedCharity(uint256 index) external view returns (address) {
        return approvedList[index];
    }
    
    function isApproved(address charity) external view returns (bool) {
        return charities[charity].approved;
    }
    
    function isFrozen(address charity) external view returns (bool) {
        return charities[charity].frozen;
    }
    
    /// @notice Get count of active charities (approved and not frozen)
    function getActiveCount() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < approvedList.length; i++) {
            if (!charities[approvedList[i]].frozen) {
                count++;
            }
        }
        return count;
    }
}

/// ────────────────────────── SanctumVault (Humanitarian Fund Accumulator & Distributor)
contract SanctumVault {
    event Dispersed(uint256 totalAmount, uint256 charityCount, uint64 timestamp);
    event CharityPaid(address indexed charity, uint256 amount);
    event IntervalUpdated(uint64 oldInterval, uint64 newInterval);
    event DAOChanged(address indexed newDAO);
    event Received(address indexed from, uint256 amount);

    address public dao;
    ITokenLike_Trust public token;
    SanctumRegistry public registry;
    
    uint64 public dispersalInterval = 30 days;  // How often to distribute (default monthly)
    uint64 public lastDispersal;                // Last distribution timestamp
    
    /// @dev DAO governance requires 2/3 majority vote to execute any function
    /// This is enforced at the DAO contract level, not here
    modifier onlyDAO() { if (msg.sender != dao) revert TRUST_NotDAO(); _; }
    
    constructor(address _dao, address _token, address _registry) {
        if (_dao == address(0)) revert TRUST_Zero();
        dao = _dao;
        if (_token != address(0)) token = ITokenLike_Trust(_token);
        if (_registry != address(0)) registry = SanctumRegistry(_registry);
        lastDispersal = uint64(block.timestamp);  // Start timer on deployment
    }
    
    function setDAO(address _dao) external onlyDAO {
        if (_dao == address(0)) revert TRUST_Zero();
        dao = _dao;
        emit DAOChanged(_dao);
    }
    
    function setModules(address _token, address _registry) external onlyDAO {
        if (_token != address(0)) token = ITokenLike_Trust(_token);
        if (_registry != address(0)) registry = SanctumRegistry(_registry);
    }
    
    /// @notice DAO can adjust distribution frequency (requires 2/3 vote at DAO level)
    function setDispersalInterval(uint64 _interval) external onlyDAO {
        if (_interval < 1 days) revert TRUST_Bounds();  // Minimum 1 day
        if (_interval > 365 days) revert TRUST_Bounds(); // Maximum 1 year
        uint64 old = dispersalInterval;
        dispersalInterval = _interval;
        emit IntervalUpdated(old, _interval);
    }
    
    /// @notice Check if dispersal is ready (interval passed since last)
    function canDisperse() public view returns (bool) {
        return block.timestamp >= lastDispersal + dispersalInterval;
    }
    
    /// @notice Distribute accumulated funds equally among active (non-frozen) charities
    /// @dev Can be called by anyone once interval passes (permissionless trigger)
    /// @dev Only distributes to charities that are approved AND not frozen
    function disperse() external {
        if (!canDisperse()) revert TRUST_Bounds();
        
        uint256 balance = token.balanceOf(address(this));
        if (balance == 0) return;  // Nothing to distribute
        
        // Get active (approved and not frozen) charities
        uint256 totalCharities = registry.getApprovedCount();
        if (totalCharities == 0) revert TRUST_NoApprovedCharities();
        
        // Count active (non-frozen) charities
        address[] memory activeCharities = new address[](totalCharities);
        uint256 activeCount = 0;
        
        for (uint256 i = 0; i < totalCharities; i++) {
            address charity = registry.getApprovedCharity(i);
            if (!registry.isFrozen(charity)) {
                activeCharities[activeCount] = charity;
                activeCount++;
            }
        }
        
        if (activeCount == 0) revert TRUST_NoApprovedCharities();  // All frozen
        
        // Distribute equally among active charities
        uint256 amountPerCharity = balance / activeCount;
        uint256 distributed = 0;
        
        for (uint256 i = 0; i < activeCount; i++) {
            address charity = activeCharities[i];
            bool success = token.transfer(charity, amountPerCharity);
            if (success) {
                distributed += amountPerCharity;
                emit CharityPaid(charity, amountPerCharity);
            }
        }
        
        lastDispersal = uint64(block.timestamp);
        emit Dispersed(distributed, activeCount, uint64(block.timestamp));
    }
}

/// ────────────────────────── ProofScoreBurnRouterPlus
contract ProofScoreBurnRouterPlus {
    event SeerSet(address seer);
    event PolicySet(uint16 maxBurnBps, uint16 minBurnBps, address treasury, address sanctumRegistry);

    address public dao;
    Seer    public seer;

    // Dynamic burn policy: scales from maxBurnBps (score 0) to minBurnBps (score 1000)
    uint16 public maxBurnBps = 1000;  // 10.00% for score 0 (worst)
    uint16 public minBurnBps = 25;    // 0.25% for score 1000 (perfect)
    
    // Burn split (25% burned, 50% treasury, 25% sanctum vault → charities) - ANTI-KING MODEL
    address public treasury;          // Ecosystem Treasury - receives 50% of burn (was 25%)
                                      // Increased to 50% for long-term sustainability (DAO fair compensation)
                                      // Conditional merchant fee subsidy:
                                      //   Score ≥750: Treasury pays fees, users pay nothing (feeless merchants)
                                      //   Score 560-749: No subsidy, users pay score-based fees
                                      //   Score <560: DAO removes merchant from ecosystem
                                      // Also funds: gas subsidies, DAO service stipends, operations, security
    address public sanctumVault;      // SanctumVault - accumulates 25% of burn, disperses to charities
    SanctumRegistry public sanctumRegistry;  // Registry of DAO-approved humanitarian charities
                                      // Remaining 25% permanently burned (reduced from 50% for treasury sustainability)

    modifier onlyDAO() { if (msg.sender != dao) revert TRUST_NotDAO(); _; }

    constructor(address _dao, address _seer, address _treasury, address _sanctumVault, address _sanctumRegistry) {
        if (_dao == address(0)) revert TRUST_Zero();
        dao = _dao;
        if (_seer != address(0)) seer = Seer(_seer);
        treasury = _treasury;
        sanctumVault = _sanctumVault;
        if (_sanctumRegistry != address(0)) sanctumRegistry = SanctumRegistry(_sanctumRegistry);
    }

    function setDAO(address _dao) external onlyDAO {
        if (_dao == address(0)) revert TRUST_Zero();
        dao = _dao;
    }

    function setModules(address _seer, address _treasury, address _sanctumVault, address _sanctumRegistry) external onlyDAO {
        if (_seer == address(0)) revert TRUST_Zero();
        seer = Seer(_seer);
        treasury = _treasury;
        sanctumVault = _sanctumVault;
        if (_sanctumRegistry != address(0)) sanctumRegistry = SanctumRegistry(_sanctumRegistry);
        emit SeerSet(_seer);
    }

    function setPolicy(
        uint16 _maxBurnBps,
        uint16 _minBurnBps,
        address _treasury,
        address _sanctumVault,
        address _sanctumRegistry
    ) external onlyDAO {
        if (_maxBurnBps > 4000) revert TRUST_Bounds(); // hard ceiling 40% for safety
        if (_minBurnBps > _maxBurnBps) revert TRUST_Bounds();
        maxBurnBps = _maxBurnBps;
        minBurnBps = _minBurnBps;
        treasury = _treasury;
        sanctumVault = _sanctumVault;
        if (_sanctumRegistry != address(0)) sanctumRegistry = SanctumRegistry(_sanctumRegistry);
        emit PolicySet(maxBurnBps, minBurnBps, treasury, _sanctumRegistry);
    }

    struct Route { 
        uint16 totalBurnBps;      // Total burn fee (scales 10% → 0.25%)
        uint16 permanentBurnBps;  // 25% burned permanently (reduced for treasury sustainability)
        uint16 treasuryBps;       // 50% to ecosystem treasury (increased from 25% - ANTI-KING MODEL)
        uint16 sanctumBps;        // 25% to SanctumVault (accumulates, disperses to charities)
        uint256 charityCount;     // Number of active charities (approved and not frozen)
    }

    /**
     * Computes dynamic burn fee from PERSONAL ProofScore (0-1000).
     * Uses personal vault score, NOT merchant score.
     * - Score 0 (worst): 10.00% total burn
     * - Score 500 (neutral): ~5.10% total burn
     * - Score 900-1000 (excellent): 0.25% total burn
     * 
     * Linear interpolation: totalBurn = maxBurnBps - (score * (maxBurnBps - minBurnBps) / 1000)
     * Split (ANTI-KING MODEL): 25% permanent burn, 50% ecosystem treasury (DAO sustainability), 25% humanitarian charity (Sanctum)
     * 
     * VFIDE MISSION: Integrity over wealth
     * Treasury (50%) funds: Fair DAO service stipends, feeless merchants (score ≥750), gas subsidies, operations, security
     * NOT for: Wealth accumulation, staking APY, insider enrichment
     * 
     * Note: Merchant fee subsidy is based on MERCHANT score (separate), checked via qualifiesForFeeSubsidy()
     */
    function routeFor(address subject) public view returns (Route memory r) {
        uint16 score = seer.getScore(subject); // Personal score 0-1000, defaults to 500 neutral
        
        // Linear scaling: totalBurn = max - (score * range / 1000)
        // Example: score 0 → 1000 bps (10%), score 500 → 512 bps (~5.1%), score 1000 → 25 bps (0.25%)
        uint256 range = maxBurnBps - minBurnBps;  // 1000 - 25 = 975
        uint256 reduction = (uint256(score) * range) / 1000;
        uint16 totalBurn = maxBurnBps - uint16(reduction);
        
        // ANTI-KING SPLIT: 25% permanent burn, 50% treasury (DAO sustainability), 25% charities
        uint16 permanent = totalBurn / 4;                    // 25% burned (reduced from 50%)
        uint16 treasuryShare = totalBurn / 2;                // 50% ecosystem treasury (increased from 25% for long-term sustainability)
        uint16 sanctumShare = totalBurn - permanent - treasuryShare;  // 25% humanitarian charities (handles rounding)
        
        // Get active (non-frozen) charity count for distribution info
        uint256 charityCount = address(sanctumRegistry) != address(0) ? sanctumRegistry.getActiveCount() : 0;
        
        r = Route(totalBurn, permanent, treasuryShare, sanctumShare, charityCount);
    }
    
    /// @notice Get SanctumVault address for token transfers
    /// @dev Token contract sends sanctumBps amount to this vault
    function getSanctumVault() external view returns (address) {
        return sanctumVault;
    }
    
    /// @notice Get list of active charity addresses (for info/UI purposes)
    /// @dev Returns only approved AND non-frozen charities
    function getActiveCharities() external view returns (address[] memory) {
        if (address(sanctumRegistry) == address(0)) {
            return new address[](0);
        }
        
        uint256 totalCount = sanctumRegistry.getApprovedCount();
        if (totalCount == 0) return new address[](0);
        
        // First pass: count active charities
        uint256 activeCount = 0;
        for (uint256 i = 0; i < totalCount; i++) {
            address charity = sanctumRegistry.getApprovedCharity(i);
            if (!sanctumRegistry.isFrozen(charity)) {
                activeCount++;
            }
        }
        
        // Second pass: collect active charities
        address[] memory active = new address[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < totalCount; i++) {
            address charity = sanctumRegistry.getApprovedCharity(i);
            if (!sanctumRegistry.isFrozen(charity)) {
                active[index] = charity;
                index++;
            }
        }
        
        return active;
    }
}