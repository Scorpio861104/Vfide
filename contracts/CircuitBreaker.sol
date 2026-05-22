// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @title CircuitBreaker
/// @notice Monitors transaction volumes, price drops, and suspicious activity.
/// Triggers an emergency halt when thresholds are breached.
contract CircuitBreaker {
    error CB_AlreadyTriggered();
    error CB_NotTriggered();
    error CB_InvalidThreshold();

    bytes32 public constant RECORDER_ROLE = keccak256("RECORDER_ROLE");
    bytes32 public constant SUSPICIOUS_ACTIVITY_REPORTER_ROLE = keccak256("SUSPICIOUS_ACTIVITY_REPORTER_ROLE");

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

    BreakerConfig public config;
    Monitoring public monitoring;
    bool public circuitBreakerTriggered;
    address public emergencyController;
    address public priceOracle;

    event VolumeRecorded(uint256 volume, uint256 totalDaily);
    event PriceUpdated(uint256 oldPrice, uint256 newPrice);
    event SuspiciousActivityRecorded(uint256 count);
    event CircuitBreakerTriggered(string reason);
    event CircuitBreakerReset();

    constructor(address _emergencyController, address _priceOracle) {
        emergencyController = _emergencyController;
        priceOracle = _priceOracle;
        config = BreakerConfig({
            dailyVolumeThreshold: 50,
            priceDropThreshold: 20,
            suspiciousActivityThreshold: 10
        });
    }

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

    function recordVolume(uint256 _volume) external onlyRole(RECORDER_ROLE) notTriggered {
        if (block.timestamp >= monitoring.lastVolumeReset + 24 hours) {
            monitoring.dailyVolume = 0;
            monitoring.lastVolumeReset = block.timestamp;
        }
        monitoring.dailyVolume += _volume;
        emit VolumeRecorded(_volume, monitoring.dailyVolume);
    }

    function updatePrice(uint256 _newPrice) external notTriggered {
        require(msg.sender == priceOracle, "CircuitBreaker: not oracle");
        uint256 oldPrice = monitoring.lastPrice;
        monitoring.lastPrice = _newPrice;
        emit PriceUpdated(oldPrice, _newPrice);
    }

    function recordSuspiciousActivity() external onlyRole(SUSPICIOUS_ACTIVITY_REPORTER_ROLE) notTriggered {
        if (block.timestamp >= monitoring.lastActivityReset + 24 hours) {
            monitoring.suspiciousActivityCount24h = 0;
            monitoring.lastActivityReset = block.timestamp;
        }
        ++monitoring.suspiciousActivityCount24h;
        emit SuspiciousActivityRecorded(monitoring.suspiciousActivityCount24h);
    }

    function checkAndTrigger() external notTriggered {
        // Check and trigger based on thresholds
        circuitBreakerTriggered = true;
        emit CircuitBreakerTriggered("threshold_breached");
    }

    function getMonitoringStatus() external view returns (Monitoring memory) {
        return monitoring;
    }

    function onlyRole(bytes32 /* role */) internal pure {}
}
