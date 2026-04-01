// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./VFIDEAccessControl.sol";

interface IEmergencyController {
    function emergencyPause() external;
}

/**
 * @title CircuitBreaker
 * @notice Auto-pause system based on monitoring key ecosystem metrics
 * @dev Triggers emergency pause when thresholds are exceeded
 */
contract CircuitBreaker is VFIDEAccessControl {
    bytes32 public constant RECORDER_ROLE = keccak256("RECORDER_ROLE");
    
    struct TriggerConfig {
        bool enabled;
        uint256 dailyVolumeThreshold;    // % of TVL (e.g., 50 = 50%)
        uint256 priceDropThreshold;       // % drop in 1h (e.g., 20 = 20%)
        uint256 blacklistThreshold;       // count in 24h
        uint256 monitoringWindow;         // time window for metrics
    }

    struct MonitoringData {
        uint256 totalValueLocked;
        uint256 dailyVolume;
        uint256 lastVolumeReset;
        uint256 lastPrice;
        uint256 lastPriceUpdate;
        uint256 blacklistCount24h;
        uint256 lastBlacklistReset;
    }

    struct TriggerEvent {
        uint256 timestamp;
        string reason;
        uint256 metricValue;
        address triggeredBy;
    }

    TriggerConfig public config;
    MonitoringData public monitoring;
    
    address public priceOracle;
    address public emergencyController;
    
    bool public circuitBreakerTriggered;
    uint256 public lastTriggerTime;
    uint256 private _guardLock;
    
    TriggerEvent[] public triggerHistory;
    uint256 public constant MAX_TRIGGER_HISTORY = 1000;

    event CircuitBreakerConfigured(
        uint256 dailyVolumeThreshold,
        uint256 priceDropThreshold,
        uint256 blacklistThreshold
    );
    
    event CircuitBreakerTriggered(
        string reason,
        uint256 metricValue,
        uint256 timestamp,
        address indexed triggeredBy
    );
    
    event CircuitBreakerReset(address indexed resetBy, uint256 timestamp);
    event PriceOracleUpdated(address indexed newOracle);
    event EmergencyControllerUpdated(address indexed newController);
    event VolumeRecorded(uint256 amount, uint256 totalDaily);
    event BlacklistIncremented(uint256 count24h);

    modifier notTriggered() {
        require(!circuitBreakerTriggered, "CircuitBreaker: already triggered");
        _;
    }

    modifier nonReentrantCB() {
        require(_guardLock == 0, "CircuitBreaker: reentrant call");
        _guardLock = 1;
        _;
        _guardLock = 0;
    }

    modifier onlyEmergencyController() {
        require(msg.sender == emergencyController, "CircuitBreaker: not emergency controller");
        _;
    }

    /**
     * @notice Constructor
     * @param _admin Admin address
     * @param _priceOracle Price oracle address
     * @param _emergencyController Emergency controller address
     */
    constructor(
        address _admin,
        address _priceOracle,
        address _emergencyController
    ) VFIDEAccessControl(_admin) {
        require(_priceOracle != address(0), "CircuitBreaker: zero oracle address");
        require(_emergencyController != address(0), "CircuitBreaker: zero controller address");
        
        priceOracle = _priceOracle;
        emergencyController = _emergencyController;

        config = TriggerConfig({
            enabled: true,
            dailyVolumeThreshold: 50,      // 50% of TVL
            priceDropThreshold: 20,         // 20% drop
            blacklistThreshold: 10,         // 10 blacklists
            monitoringWindow: 1 hours
        });

        monitoring.lastVolumeReset = block.timestamp;
        monitoring.lastPriceUpdate = block.timestamp;
        monitoring.lastBlacklistReset = block.timestamp;
    }

    /**
     * @notice Configure circuit breaker thresholds
     * @param _dailyVolumeThreshold Daily volume threshold as % of TVL
     * @param _priceDropThreshold Price drop threshold %
     * @param _blacklistThreshold Blacklist count threshold in 24h
     */
    function configure(
        uint256 _dailyVolumeThreshold,
        uint256 _priceDropThreshold,
        uint256 _blacklistThreshold
    ) external onlyRole(CONFIG_MANAGER_ROLE) {
        require(_dailyVolumeThreshold <= 100, "CircuitBreaker: invalid volume threshold");
        require(_priceDropThreshold <= 100, "CircuitBreaker: invalid price threshold");

        config.dailyVolumeThreshold = _dailyVolumeThreshold;
        config.priceDropThreshold = _priceDropThreshold;
        config.blacklistThreshold = _blacklistThreshold;

        emit CircuitBreakerConfigured(_dailyVolumeThreshold, _priceDropThreshold, _blacklistThreshold);
    }

    /**
     * @notice Record transaction volume and check threshold
     * @param _volume Transaction volume to record
     */
    function recordVolume(uint256 _volume) external onlyRole(RECORDER_ROLE) notTriggered nonReentrantCB {
        if (!config.enabled) return;

        // Reset daily volume after 24h
        if (block.timestamp >= monitoring.lastVolumeReset + 1 days) {
            monitoring.dailyVolume = 0;
            monitoring.lastVolumeReset = block.timestamp;
        }

        monitoring.dailyVolume += _volume;

        emit VolumeRecorded(_volume, monitoring.dailyVolume);

        // Check volume threshold
        uint256 maxDailyVolume = (monitoring.totalValueLocked * config.dailyVolumeThreshold) / 100;
        
        if (monitoring.dailyVolume > maxDailyVolume && maxDailyVolume > 0) {
            _trigger(
                "Daily volume exceeded threshold",
                monitoring.dailyVolume
            );
        }
    }

    /**
     * @notice Update price and check for significant drops
     * @param _newPrice New price from oracle
     */
    function updatePrice(uint256 _newPrice) external notTriggered nonReentrantCB {
        if (!config.enabled) return;
        require(msg.sender == priceOracle, "CircuitBreaker: not oracle");
        require(_newPrice > 0, "CircuitBreaker: invalid price");

        uint256 lastPrice = monitoring.lastPrice;
        uint256 lastPriceUpdate = monitoring.lastPriceUpdate;

        // Persist the latest oracle sample before any potential external trigger path.
        monitoring.lastPrice = _newPrice;
        monitoring.lastPriceUpdate = block.timestamp;

        if (lastPrice > 0 && 
            block.timestamp <= lastPriceUpdate + config.monitoringWindow) {
            
            // Calculate price drop percentage
            if (_newPrice < lastPrice) {
                uint256 drop = lastPrice - _newPrice;
                uint256 dropPercent = (drop * 100) / lastPrice;

                if (dropPercent >= config.priceDropThreshold) {
                    _trigger(
                        "Price drop exceeded threshold",
                        dropPercent
                    );
                }
            }
        }
    }

    /**
     * @notice Increment blacklist counter and check threshold
     */
    function incrementBlacklist() external onlyRole(BLACKLIST_MANAGER_ROLE) notTriggered nonReentrantCB {
        if (!config.enabled) return;

        // Reset counter after 24h
        if (block.timestamp >= monitoring.lastBlacklistReset + 1 days) {
            monitoring.blacklistCount24h = 0;
            monitoring.lastBlacklistReset = block.timestamp;
        }

        monitoring.blacklistCount24h++;

        emit BlacklistIncremented(monitoring.blacklistCount24h);

        if (monitoring.blacklistCount24h > config.blacklistThreshold) {
            _trigger(
                "Blacklist count exceeded threshold",
                monitoring.blacklistCount24h
            );
        }
    }

    /**
     * @notice Update total value locked
     * @param _tvl New TVL value
     */
    function updateTVL(uint256 _tvl) external onlyRole(CONFIG_MANAGER_ROLE) {
        monitoring.totalValueLocked = _tvl;
    }

    /**
     * @notice Manual trigger by governance
     * @param _reason Reason for manual trigger
     */
    function manualTrigger(string calldata _reason) 
        external 
        onlyRole(EMERGENCY_PAUSER_ROLE) 
        notTriggered
        nonReentrantCB
    {
        require(bytes(_reason).length > 0, "CircuitBreaker: reason required");
        _trigger(_reason, 0);
    }

    /**
     * @notice FINAL-09 FIX: Public permissionless check that automatically triggers the circuit
     *         breaker if any configured threshold is currently exceeded.
     * @dev Allows high-frequency paths (e.g., token transfers) or off-chain keepers to call this
     *      without requiring a specific role. No state is written if thresholds are not exceeded.
     * @return triggered True if the circuit breaker was triggered by this call.
     */
    function checkAndTrigger() external notTriggered nonReentrantCB returns (bool triggered) {
        if (!config.enabled) return false;

        // Check daily volume threshold
        if (monitoring.totalValueLocked > 0 && config.dailyVolumeThreshold > 0) {
            uint256 volumeThreshold = (monitoring.totalValueLocked * config.dailyVolumeThreshold) / 100;
            if (monitoring.dailyVolume >= volumeThreshold) {
                _trigger("auto: daily volume threshold exceeded", monitoring.dailyVolume);
                return true;
            }
        }

        // Check blacklist threshold
        if (config.blacklistThreshold > 0 && monitoring.blacklistCount24h >= config.blacklistThreshold) {
            _trigger("auto: blacklist threshold exceeded", monitoring.blacklistCount24h);
            return true;
        }

        return false;
    }

    /**
     * @notice Reset circuit breaker
     * @dev Can only be called by governance to resume operations
     */
    function reset() external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrantCB {
        require(circuitBreakerTriggered, "CircuitBreaker: not triggered");
        
        circuitBreakerTriggered = false;
        
        // Reset monitoring counters
        monitoring.dailyVolume = 0;
        monitoring.blacklistCount24h = 0;
        monitoring.lastVolumeReset = block.timestamp;
        monitoring.lastBlacklistReset = block.timestamp;

        emit CircuitBreakerReset(msg.sender, block.timestamp);
    }

    /**
     * @notice Enable or disable circuit breaker
     * @param _enabled True to enable, false to disable
     */
    function setEnabled(bool _enabled) external onlyRole(DEFAULT_ADMIN_ROLE) {
        config.enabled = _enabled;
    }

    /**
     * @notice Update price oracle address
     * @param _newOracle New oracle address
     */
    function updatePriceOracle(address _newOracle) external onlyRole(CONFIG_MANAGER_ROLE) {
        require(_newOracle != address(0), "CircuitBreaker: zero address");
        priceOracle = _newOracle;
        emit PriceOracleUpdated(_newOracle);
    }

    /**
     * @notice Update emergency controller address
     * @param _newController New controller address
     */
    function updateEmergencyController(address _newController) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(_newController != address(0), "CircuitBreaker: zero address");
        emergencyController = _newController;
        emit EmergencyControllerUpdated(_newController);
    }

    /**
     * @notice Get trigger history
     * @return history Array of trigger events
     */
    function getTriggerHistory() external view returns (TriggerEvent[] memory history) {
        uint256 len = triggerHistory.length;
        uint256 start = len > MAX_TRIGGER_HISTORY ? len - MAX_TRIGGER_HISTORY : 0;
        uint256 count = len - start;
        history = new TriggerEvent[](count);
        for (uint256 i = 0; i < count; i++) {
            history[i] = triggerHistory[start + i];
        }
    }

    /**
     * @notice Get current monitoring status
        * @return tvl Total value locked
        * @return dailyVolume Daily volume
        * @return volumePercent Daily volume percent of TVL
        * @return currentPrice Last observed price
        * @return blacklistCount Blacklist count in 24h window
        * @return isTriggered Whether circuit breaker is triggered
     */
    function getMonitoringStatus() 
        external 
        view 
        returns (
            uint256 tvl,
            uint256 dailyVolume,
            uint256 volumePercent,
            uint256 currentPrice,
            uint256 blacklistCount,
            bool isTriggered
        ) 
    {
        tvl = monitoring.totalValueLocked;
        dailyVolume = monitoring.dailyVolume;
        volumePercent = tvl > 0 ? (dailyVolume * 100) / tvl : 0;
        currentPrice = monitoring.lastPrice;
        blacklistCount = monitoring.blacklistCount24h;
        isTriggered = circuitBreakerTriggered;
    }

    /**
     * @notice Check if any threshold is close to triggering
        * @return warnings Array of warning messages
     */
    function checkWarnings() external view returns (string[] memory warnings) {
        uint256 warningCount = 0;
        string[] memory tempWarnings = new string[](3);

        // Volume warning (80% of threshold)
        if (monitoring.totalValueLocked > 0) {
            uint256 warningThreshold = (monitoring.totalValueLocked * config.dailyVolumeThreshold * 80) / 10000;
            
            if (monitoring.dailyVolume > warningThreshold) {
                tempWarnings[warningCount++] = "Volume approaching threshold";
            }
        }

        // Blacklist warning (80% of threshold)
        uint256 blacklistWarning = (config.blacklistThreshold * 80) / 100;
        if (monitoring.blacklistCount24h > blacklistWarning) {
            tempWarnings[warningCount++] = "Blacklist count approaching threshold";
        }

        // Price volatility warning
        if (monitoring.lastPrice > 0 && 
            block.timestamp <= monitoring.lastPriceUpdate + config.monitoringWindow) {
            tempWarnings[warningCount++] = "Price monitoring active";
        }

        // Resize array to actual warning count
        warnings = new string[](warningCount);
        for (uint256 i = 0; i < warningCount; i++) {
            warnings[i] = tempWarnings[i];
        }
    }

    /**
     * @notice Internal function to trigger circuit breaker
     * @param _reason Reason for trigger
     * @param _metricValue Value of the metric that triggered
     */
    function _trigger(string memory _reason, uint256 _metricValue) internal {
        circuitBreakerTriggered = true;
        lastTriggerTime = block.timestamp;

        triggerHistory.push(TriggerEvent({
            timestamp: block.timestamp,
            reason: _reason,
            metricValue: _metricValue,
            triggeredBy: msg.sender
        }));

        emit CircuitBreakerTriggered(_reason, _metricValue, block.timestamp, msg.sender);

        // Call emergency controller to pause contracts
        if (emergencyController != address(0)) {
            try IEmergencyController(emergencyController).emergencyPause() {
            } catch {
                // Don't revert if emergency controller call fails
                // Circuit breaker should still trigger
            }
        }
    }
}
