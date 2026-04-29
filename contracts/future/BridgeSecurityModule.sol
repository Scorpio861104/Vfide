// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "../SharedInterfaces.sol";

/**
 * @title BridgeSecurityModule
 * @notice Security controls for cross-chain bridge operations
 * @dev Implements rate limiting, daily caps, and suspicious transfer detection
 * 
 * Features:
 * - Hourly rate limiting (max 100K tokens/hour)
 * - Daily transfer caps (1M tokens/day)
 * - Per-user rate limits
 * - Suspicious transfer detection
 * - Multi-oracle verification support
 * - Emergency shutdown capability
 */
contract BridgeSecurityModule is Ownable, Pausable, ReentrancyGuard {
    /// @notice Hourly rate limit (100,000 VFIDE)
    uint256 public constant HOURLY_RATE_LIMIT = 100_000 * 1e18;

    /// @notice Daily cap (1,000,000 VFIDE)
    uint256 public constant DAILY_CAP = 1_000_000 * 1e18;

    /// @notice Per-user hourly limit (10,000 VFIDE)
    uint256 public userHourlyLimit = 10_000 * 1e18;

    /// @notice Per-user daily limit (50,000 VFIDE)
    uint256 public userDailyLimit = 50_000 * 1e18;

    /// @notice Authorized bridge address
    address public bridge;

    /// @notice Oracle addresses for verification
    mapping(address => bool) public authorizedOracles;
    uint256 public oracleCount;
    uint256 public requiredOracles = 2; // 2 of 3 oracles must approve

    /// @notice Hourly volume tracking
    struct HourlyVolume {
        uint256 amount;
        uint256 timestamp;
    }

    /// @notice Daily volume tracking
    struct DailyVolume {
        uint256 amount;
        uint256 timestamp;
    }

    /// @notice Global volume tracking
    mapping(uint256 => HourlyVolume) public hourlyVolume;
    mapping(uint256 => DailyVolume) public dailyVolume;

    /// @notice User volume tracking
    mapping(address => mapping(uint256 => uint256)) public userHourlyVolume;
    mapping(address => mapping(uint256 => uint256)) public userDailyVolume;

    /// @notice Suspicious transfer tracking
    mapping(address => SuspiciousFlags) public suspiciousActivity;
    /// @notice Deprecated legacy field kept for ABI compatibility.
    mapping(address => bool) public blacklist;


    struct SuspiciousFlags {
        uint256 rapidTransferCount;
        uint256 lastTransferTime;
        bool flagged;
    }

    /// @notice Whitelist for high-volume users
    mapping(address => bool) public whitelist;

    // Events
    event RateLimitChecked(address indexed user, uint256 amount, bool approved);
    event UserLimitUpdated(uint256 hourly, uint256 daily);
    event SuspiciousActivityDetected(address indexed user, string reason);
    event UserWhitelisted(address indexed user, bool status);
    event UserBlacklisted(address indexed user, bool status);
    event BridgeUpdated(address indexed oldBridge, address indexed newBridge);
    event OracleAuthorized(address indexed oracle, bool authorized);
    event RequiredOraclesUpdated(uint256 oldCount, uint256 newCount);

    error Unauthorized();
    error RateLimitExceeded();
    error DailyCapExceeded();
    error SuspiciousActivity();
    error Blacklisted();

    modifier onlyBridge() {
        if (msg.sender != bridge) revert Unauthorized();
        _;
    }

    constructor(address _owner, address _bridge) {
        require(_owner != address(0), "Invalid owner");
        require(_bridge != address(0), "Invalid bridge");
        owner = _owner; // H-18: Override default msg.sender
        bridge = _bridge;
    }

    /**
     * @notice Check if transfer passes rate limits
     * @param user User address
     * @param amount Transfer amount
     * @return approved Whether transfer is approved
     */
    function checkRateLimit(
        address user,
        uint256 amount
    ) external onlyBridge whenNotPaused nonReentrant returns (bool approved) {
        // BSM-01: Reject flagged users (fail-closed once flagged).
        if (suspiciousActivity[user].flagged) revert SuspiciousActivity();

        // Whitelist bypasses limits
        if (whitelist[user]) {
            emit RateLimitChecked(user, amount, true);
            return true;
        }

        uint256 currentHour = block.timestamp / 1 hours;
        uint256 currentDay = block.timestamp / 1 days;

        // Load and refresh rolling buckets in storage first, then enforce + update in one flow.
        HourlyVolume storage hourVol = hourlyVolume[currentHour];
        if (hourVol.timestamp != currentHour) {
            hourVol.amount = 0;
            hourVol.timestamp = currentHour;
        }
        if (hourVol.amount + amount > HOURLY_RATE_LIMIT) {
            revert RateLimitExceeded();
        }

        DailyVolume storage dayVol = dailyVolume[currentDay];
        if (dayVol.timestamp != currentDay) {
            dayVol.amount = 0;
            dayVol.timestamp = currentDay;
        }
        if (dayVol.amount + amount > DAILY_CAP) {
            revert DailyCapExceeded();
        }

        // Check user hourly limit
        uint256 userHourVol = userHourlyVolume[user][currentHour];
        if (userHourVol + amount > userHourlyLimit) {
            revert RateLimitExceeded();
        }

        // Check user daily limit
        uint256 userDayVol = userDailyVolume[user][currentDay];
        if (userDayVol + amount > userDailyLimit) {
            revert DailyCapExceeded();
        }

        // Check for suspicious activity
        _checkSuspiciousActivity(user, amount);

        // Update volumes
        hourVol.amount += amount;
        dayVol.amount += amount;
        userHourlyVolume[user][currentHour] += amount;
        userDailyVolume[user][currentDay] += amount;

        emit RateLimitChecked(user, amount, true);
        return true;
    }

    /**
     * @notice Check for suspicious activity patterns
     * @param user User address
     * @param amount Transfer amount
     */
    function _checkSuspiciousActivity(address user, uint256 amount) internal {
        SuspiciousFlags storage flags = suspiciousActivity[user];

        // Check rapid transfers (more than 5 in 5 minutes)
        if (block.timestamp - flags.lastTransferTime < 5 minutes) {
            flags.rapidTransferCount++;
            if (flags.rapidTransferCount > 5 && !flags.flagged) {
                flags.flagged = true;
                emit SuspiciousActivityDetected(user, "Rapid transfers detected");
            }
        } else {
            flags.rapidTransferCount = 0;
        }

        flags.lastTransferTime = block.timestamp;

        // Check for large suspicious amounts (>50% of daily limit in one tx)
        if (amount > userDailyLimit / 2 && !whitelist[user]) {
            emit SuspiciousActivityDetected(user, "Large single transaction");
        }
    }

    /**
     * @notice Set user limits
     * @param _hourlyLimit New hourly limit
     * @param _dailyLimit New daily limit
     */
    function setUserLimits(uint256 _hourlyLimit, uint256 _dailyLimit) external onlyOwner {
        require(_hourlyLimit > 0 && _dailyLimit > 0, "Invalid limits");
        require(_hourlyLimit <= HOURLY_RATE_LIMIT, "Exceeds global hourly limit");
        require(_dailyLimit <= DAILY_CAP, "Exceeds global daily cap");
        require(_hourlyLimit <= _dailyLimit, "Hourly exceeds daily");
        userHourlyLimit = _hourlyLimit;
        userDailyLimit = _dailyLimit;
        emit UserLimitUpdated(_hourlyLimit, _dailyLimit);
    }

    /**
     * @notice Whitelist user
     * @param user User address
     * @param status Whitelist status
     */
    function setWhitelist(address user, bool status) external onlyOwner {
        require(user != address(0), "Invalid user");
        whitelist[user] = status;
        emit UserWhitelisted(user, status);
    }

    /**
     * @notice Update bridge address
     * @param _bridge New bridge address
     */
    function setBridge(address _bridge) external onlyOwner {
        require(_bridge != address(0), "Invalid bridge");
        address oldBridge = bridge;
        bridge = _bridge;
        emit BridgeUpdated(oldBridge, _bridge);
    }

    /**
     * @notice Authorize oracle
     * @param oracle Oracle address
     * @param authorized Authorization status
     */
    function setOracle(address oracle, bool authorized) external onlyOwner {
        require(oracle != address(0), "Invalid oracle");
        bool wasAuthorized = authorizedOracles[oracle];
        authorizedOracles[oracle] = authorized;

        if (authorized && !wasAuthorized) {
            oracleCount++;
        } else if (!authorized && wasAuthorized) {
            oracleCount--;
        }

        emit OracleAuthorized(oracle, authorized);
    }

    /**
     * @notice Deprecated: blacklist controls are disabled to preserve non-custodial guarantees.
     */
    function setBlacklist(address user, bool status) external onlyOwner {
        user;
        status;
        revert("BSM: blacklist disabled");
    }

    /**
     * @notice Set required oracle count
     * @param _required Required oracle count
     */
    function setRequiredOracles(uint256 _required) external onlyOwner {
        require(_required > 0, "Invalid oracle threshold");
        require(_required <= oracleCount, "Exceeds oracle count");
        uint256 oldCount = requiredOracles;
        requiredOracles = _required;
        emit RequiredOraclesUpdated(oldCount, _required);
    }

    /**
     * @notice Deprecated: manual suspicious-flag clearing is disabled.
     */
    function clearSuspiciousFlags(address user) external onlyOwner {
        user;
        revert("BSM: clear flags disabled");
    }

    /**
     * @notice Pause security checks
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause security checks
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Get current hourly volume
     * @return volume Current hour's volume
     */
    function getCurrentHourlyVolume() external view returns (uint256 volume) {
        uint256 currentHour = block.timestamp / 1 hours;
        HourlyVolume memory hourVol = hourlyVolume[currentHour];
        return (hourVol.timestamp >= currentHour && hourVol.timestamp < currentHour + 1) ? hourVol.amount : 0;
    }

    /**
     * @notice Get current daily volume
     * @return volume Current day's volume
     */
    function getCurrentDailyVolume() external view returns (uint256 volume) {
        uint256 currentDay = block.timestamp / 1 days;
        DailyVolume memory dayVol = dailyVolume[currentDay];
        return (dayVol.timestamp >= currentDay && dayVol.timestamp < currentDay + 1) ? dayVol.amount : 0;
    }

    /**
     * @notice Get user's current hourly volume
     * @param user User address
     * @return volume User's current hour volume
     */
    function getUserCurrentHourlyVolume(address user) external view returns (uint256 volume) {
        uint256 currentHour = block.timestamp / 1 hours;
        return userHourlyVolume[user][currentHour];
    }

    /**
     * @notice Get user's current daily volume
     * @param user User address
     * @return volume User's current day volume
     */
    function getUserCurrentDailyVolume(address user) external view returns (uint256 volume) {
        uint256 currentDay = block.timestamp / 1 days;
        return userDailyVolume[user][currentDay];
    }
}
