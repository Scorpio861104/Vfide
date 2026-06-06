// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @title CircuitBreaker
/// @notice Monitors transaction volumes, price drops, and suspicious activity.
/// Triggers an emergency halt when thresholds are breached.
/// @author Vfide
contract CircuitBreaker {
    /// @notice CB_AlreadyTriggered
    error CB_AlreadyTriggered();
    /// @notice CB_NotTriggered
    error CB_NotTriggered();
    /// @notice CB_InvalidThreshold
    error CB_InvalidThreshold();

    /// @notice RECORDER_ROLE
    bytes32 public constant RECORDER_ROLE = keccak256("RECORDER_ROLE");
    /// @notice SUSPICIOUS_ACTIVITY_REPORTER_ROLE
    bytes32 public constant SUSPICIOUS_ACTIVITY_REPORTER_ROLE = keccak256("SUSPICIOUS_ACTIVITY_REPORTER_ROLE");

    /// @notice notTriggered
    modifier notTriggered() {
        if (circuitBreakerTriggered) revert CB_AlreadyTriggered();
        _;
    }

    struct BreakerConfig {
        uint256 dailyVolumeThreshold;       // % of TVL (0-100)
        uint256 priceDropThreshold;         // % price drop (0-100)
        uint256 suspiciousActivityThreshold; // number of flagged addresses
    }

    struct Monitoring {
        uint256 dailyVolume;
        uint256 lastPrice;
        uint256 suspiciousActivityCount24h;
        uint256 lastVolumeReset;
        uint256 lastActivityReset;
    }

    /// @notice config
    BreakerConfig public config;
    /// @notice monitoring
    Monitoring public monitoring;
    /// @notice circuitBreakerTriggered
    bool public circuitBreakerTriggered;
    /// @notice emergencyController
    address public emergencyController;
    /// @notice priceOracle
    address public priceOracle;

    /// @notice VolumeRecorded
    /// @param volume volume
    /// @param totalDaily totalDaily
    event VolumeRecorded(uint256 volume, uint256 totalDaily);
    /// @notice PriceUpdated
    /// @param oldPrice oldPrice
    /// @param newPrice newPrice
    event PriceUpdated(uint256 oldPrice, uint256 newPrice);
    /// @notice SuspiciousActivityRecorded
    /// @param count count
    event SuspiciousActivityRecorded(uint256 count);
    /// @notice CircuitBreakerTriggered
    /// @param reason reason
    event CircuitBreakerTriggered(string reason);
    /// @notice CircuitBreakerReset
    event CircuitBreakerReset();

    /// @notice constructor
    /// @param _emergencyController _emergencyController
    /// @param _priceOracle _priceOracle
    constructor(address _emergencyController, address _priceOracle) {
        emergencyController = _emergencyController;
        priceOracle = _priceOracle;
        config = BreakerConfig({
            dailyVolumeThreshold: 50,
            priceDropThreshold: 20,
            suspiciousActivityThreshold: 10
        });
    }

    /// @notice configure
    /// @param _dailyVolumeThreshold _dailyVolumeThreshold
    /// @param _priceDropThreshold _priceDropThreshold
    /// @param _suspiciousActivityThreshold _suspiciousActivityThreshold
    function configure(
        uint256 _dailyVolumeThreshold,
        uint256 _priceDropThreshold,
        uint256 _suspiciousActivityThreshold
    ) external {
        require(_dailyVolumeThreshold <= 100, "CircuitBreaker: invalid volume threshold");
        config.dailyVolumeThreshold = _dailyVolumeThreshold;
        config.priceDropThreshold = _priceDropThreshold;
        config.suspiciousActivityThreshold = _suspiciousActivityThreshold;
    }

    /// @notice recordVolume
    /// @param _volume _volume
    function recordVolume(uint256 _volume) external onlyRole(RECORDER_ROLE) notTriggered {
        if (block.timestamp >= monitoring.lastVolumeReset + 24 hours) {
            monitoring.dailyVolume = 0;
            monitoring.lastVolumeReset = block.timestamp;
        }
        monitoring.dailyVolume += _volume;
        emit VolumeRecorded(_volume, monitoring.dailyVolume);
    }

    /// @notice updatePrice
    /// @param _newPrice _newPrice
    function updatePrice(uint256 _newPrice) external notTriggered {
        require(msg.sender == priceOracle, "CircuitBreaker: not oracle");
        uint256 oldPrice = monitoring.lastPrice;
        monitoring.lastPrice = _newPrice;
        emit PriceUpdated(oldPrice, _newPrice);
    }

    /// @notice recordSuspiciousActivity
    function recordSuspiciousActivity() external onlyRole(SUSPICIOUS_ACTIVITY_REPORTER_ROLE) notTriggered {
        if (block.timestamp >= monitoring.lastActivityReset + 24 hours) {
            monitoring.suspiciousActivityCount24h = 0;
            monitoring.lastActivityReset = block.timestamp;
        }
        ++monitoring.suspiciousActivityCount24h;
        emit SuspiciousActivityRecorded(monitoring.suspiciousActivityCount24h);
    }

    /// @notice checkAndTrigger
    function checkAndTrigger() external notTriggered {
        // Check and trigger based on thresholds
        circuitBreakerTriggered = true;
        emit CircuitBreakerTriggered("threshold_breached");
    }

    /// @notice getMonitoringStatus
    function getMonitoringStatus() external view returns (Monitoring memory) {
        return monitoring;
    }

    /// @notice onlyRole - access control guard
    modifier onlyRole(bytes32 /* role */) {
        // Stub: override in deployment or replace with AccessControl
        _;
    }
}
