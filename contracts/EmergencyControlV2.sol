// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./VFIDEAccessControl.sol";

/**
 * @title EmergencyControlV2
 * @notice Enhanced emergency control with granular pause capabilities and auto-unpause
 * @dev Extends basic pause functionality with function-level control and circuit breakers
 */
contract EmergencyControlV2 is VFIDEAccessControl {
    struct PauseConfig {
        bool globalPause;
        uint64 pauseExpiry;
        uint64 pausedAt;
        string pauseReason;
    }

    struct CircuitBreakerConfig {
        bool enabled;
        uint256 dailyVolumeCap;      // Max daily volume as % of TVL (e.g., 50 = 50%)
        uint256 priceDropThreshold;   // Max price drop % in 1h (e.g., 20 = 20%)
        uint256 blacklistThreshold;   // Max blacklists in 24h
        uint256 lastCheckpoint;
        uint256 dailyVolume;
        uint256 blacklistCount24h;
    }

    mapping(address => PauseConfig) public contractPauseStates;
    mapping(address => mapping(bytes4 => bool)) public pausedSelectors;
    
    CircuitBreakerConfig public circuitBreaker;
    
    address public priceOracle;
    uint256 public totalValueLocked;

    event ContractPaused(address indexed contractAddress, string reason, uint64 expiry, address indexed pauser);
    event ContractUnpaused(address indexed contractAddress, address indexed unpauser);
    event FunctionPaused(address indexed contractAddress, bytes4 indexed selector, address indexed pauser);
    event FunctionUnpaused(address indexed contractAddress, bytes4 indexed selector, address indexed unpauser);
    event CircuitBreakerTriggered(string reason, uint256 timestamp);
    event CircuitBreakerConfigUpdated(address indexed updater);
    event AutoUnpauseExecuted(address indexed contractAddress, uint256 timestamp);

    modifier notPaused(address _contract) {
        require(!contractPauseStates[_contract].globalPause, "EmergencyControlV2: contract paused");
        _;
    }

    modifier functionNotPaused(address _contract, bytes4 _selector) {
        require(!pausedSelectors[_contract][_selector], "EmergencyControlV2: function paused");
        _;
    }

    /**
     * @notice Constructor
     * @param _admin Address that will receive admin roles
     */
    constructor(address _admin) VFIDEAccessControl(_admin) {
        circuitBreaker.dailyVolumeCap = 50; // 50% of TVL
        circuitBreaker.priceDropThreshold = 20; // 20% drop
        circuitBreaker.blacklistThreshold = 10; // 10 blacklists
        circuitBreaker.enabled = true;
    }

    /**
     * @notice Pause entire contract globally
     * @param _contract Contract address to pause
     * @param _reason Reason for pause
     * @param _duration Duration in seconds (0 for indefinite)
     */
    function pauseContract(
        address _contract,
        string calldata _reason,
        uint64 _duration
    ) external onlyRole(EMERGENCY_PAUSER_ROLE) {
        require(_contract != address(0), "EmergencyControlV2: zero address");
        require(bytes(_reason).length > 0, "EmergencyControlV2: reason required");

        PauseConfig storage config = contractPauseStates[_contract];
        config.globalPause = true;
        config.pausedAt = uint64(block.timestamp);
        config.pauseExpiry = _duration > 0 ? uint64(block.timestamp + _duration) : type(uint64).max;
        config.pauseReason = _reason;

        emit ContractPaused(_contract, _reason, config.pauseExpiry, msg.sender);
    }

    /**
     * @notice Unpause a contract
     * @param _contract Contract address to unpause
     */
    function unpauseContract(address _contract) external onlyRole(EMERGENCY_PAUSER_ROLE) {
        require(contractPauseStates[_contract].globalPause, "EmergencyControlV2: not paused");

        delete contractPauseStates[_contract];

        emit ContractUnpaused(_contract, msg.sender);
    }

    /**
     * @notice Pause specific function by selector
     * @param _contract Contract address
     * @param _selector Function selector to pause
     */
    function pauseFunction(
        address _contract,
        bytes4 _selector
    ) external onlyRole(EMERGENCY_PAUSER_ROLE) {
        require(_contract != address(0), "EmergencyControlV2: zero address");
        require(!pausedSelectors[_contract][_selector], "EmergencyControlV2: already paused");

        pausedSelectors[_contract][_selector] = true;

        emit FunctionPaused(_contract, _selector, msg.sender);
    }

    /**
     * @notice Unpause specific function
     * @param _contract Contract address
     * @param _selector Function selector to unpause
     */
    function unpauseFunction(
        address _contract,
        bytes4 _selector
    ) external onlyRole(EMERGENCY_PAUSER_ROLE) {
        require(pausedSelectors[_contract][_selector], "EmergencyControlV2: not paused");

        delete pausedSelectors[_contract][_selector];

        emit FunctionUnpaused(_contract, _selector, msg.sender);
    }

    /**
     * @notice Batch pause multiple functions
     * @param _contract Contract address
     * @param _selectors Array of function selectors to pause
     */
    function batchPauseFunctions(
        address _contract,
        bytes4[] calldata _selectors
    ) external onlyRole(EMERGENCY_PAUSER_ROLE) {
        for (uint256 i = 0; i < _selectors.length; i++) {
            if (!pausedSelectors[_contract][_selectors[i]]) {
                pausedSelectors[_contract][_selectors[i]] = true;
                emit FunctionPaused(_contract, _selectors[i], msg.sender);
            }
        }
    }

    /**
     * @notice Auto-unpause expired contracts
     * @param _contracts Array of contract addresses to check
     */
    function checkAndAutoUnpause(address[] calldata _contracts) external {
        for (uint256 i = 0; i < _contracts.length; i++) {
            PauseConfig storage config = contractPauseStates[_contracts[i]];
            
            if (config.globalPause && 
                config.pauseExpiry != type(uint64).max && 
                block.timestamp >= config.pauseExpiry) 
            {
                delete contractPauseStates[_contracts[i]];
                emit AutoUnpauseExecuted(_contracts[i], block.timestamp);
            }
        }
    }

    /**
     * @notice Update circuit breaker configuration
     * @param _dailyVolumeCap Max daily volume as % of TVL
     * @param _priceDropThreshold Max price drop % in 1h
     * @param _blacklistThreshold Max blacklists in 24h
     */
    function updateCircuitBreakerConfig(
        uint256 _dailyVolumeCap,
        uint256 _priceDropThreshold,
        uint256 _blacklistThreshold
    ) external onlyRole(CONFIG_MANAGER_ROLE) {
        require(_dailyVolumeCap <= 100, "EmergencyControlV2: invalid volume cap");
        require(_priceDropThreshold <= 100, "EmergencyControlV2: invalid price threshold");

        circuitBreaker.dailyVolumeCap = _dailyVolumeCap;
        circuitBreaker.priceDropThreshold = _priceDropThreshold;
        circuitBreaker.blacklistThreshold = _blacklistThreshold;

        emit CircuitBreakerConfigUpdated(msg.sender);
    }

    /**
     * @notice Check circuit breaker conditions and trigger if needed
     * @param _volumeIncrease Recent volume increase
     * @param _priceChange Recent price change (can be negative)
     * @return triggered True if circuit breaker was triggered
     */
    function checkCircuitBreaker(
        uint256 _volumeIncrease,
        int256 _priceChange
    ) external returns (bool triggered) {
        if (!circuitBreaker.enabled) {
            return false;
        }

        // Reset daily counters after 24h
        if (block.timestamp >= circuitBreaker.lastCheckpoint + 1 days) {
            circuitBreaker.dailyVolume = 0;
            circuitBreaker.blacklistCount24h = 0;
            circuitBreaker.lastCheckpoint = block.timestamp;
        }

        circuitBreaker.dailyVolume += _volumeIncrease;

        // Check volume threshold
        uint256 maxDailyVolume = (totalValueLocked * circuitBreaker.dailyVolumeCap) / 100;
        if (circuitBreaker.dailyVolume > maxDailyVolume) {
            emit CircuitBreakerTriggered("Daily volume exceeded", block.timestamp);
            return true;
        }

        // Check price drop threshold
        if (_priceChange < 0) {
            uint256 dropPercent = uint256(-_priceChange);
            if (dropPercent > circuitBreaker.priceDropThreshold) {
                emit CircuitBreakerTriggered("Price drop exceeded", block.timestamp);
                return true;
            }
        }

        return false;
    }

    /**
     * @notice Increment blacklist counter for circuit breaker
     */
    function incrementBlacklistCount() external onlyRole(BLACKLIST_MANAGER_ROLE) {
        if (block.timestamp >= circuitBreaker.lastCheckpoint + 1 days) {
            circuitBreaker.blacklistCount24h = 0;
            circuitBreaker.lastCheckpoint = block.timestamp;
        }

        circuitBreaker.blacklistCount24h++;

        if (circuitBreaker.blacklistCount24h > circuitBreaker.blacklistThreshold) {
            emit CircuitBreakerTriggered("Blacklist threshold exceeded", block.timestamp);
        }
    }

    /**
     * @notice Set price oracle address
     * @param _oracle Oracle contract address
     */
    function setPriceOracle(address _oracle) external onlyRole(CONFIG_MANAGER_ROLE) {
        require(_oracle != address(0), "EmergencyControlV2: zero address");
        priceOracle = _oracle;
    }

    /**
     * @notice Update total value locked
     * @param _tvl New TVL value
     */
    function updateTVL(uint256 _tvl) external onlyRole(CONFIG_MANAGER_ROLE) {
        totalValueLocked = _tvl;
    }

    /**
     * @notice Enable or disable circuit breaker
     * @param _enabled True to enable, false to disable
     */
    function setCircuitBreakerEnabled(bool _enabled) external onlyRole(DEFAULT_ADMIN_ROLE) {
        circuitBreaker.enabled = _enabled;
    }

    /**
     * @notice Check if contract is paused
     * @param _contract Contract address
     * @return bool True if paused
     */
    function isPaused(address _contract) external view returns (bool) {
        return contractPauseStates[_contract].globalPause;
    }

    /**
     * @notice Check if function is paused
     * @param _contract Contract address
     * @param _selector Function selector
     * @return bool True if paused
     */
    function isFunctionPaused(address _contract, bytes4 _selector) external view returns (bool) {
        return pausedSelectors[_contract][_selector];
    }

    /**
     * @notice Get pause configuration for a contract
     * @param _contract Contract address
     * @return Pause configuration details
     */
    function getPauseConfig(address _contract) 
        external 
        view 
        returns (
            bool globalPause,
            uint64 pauseExpiry,
            uint64 pausedAt,
            string memory pauseReason
        ) 
    {
        PauseConfig storage config = contractPauseStates[_contract];
        return (
            config.globalPause,
            config.pauseExpiry,
            config.pausedAt,
            config.pauseReason
        );
    }
}
