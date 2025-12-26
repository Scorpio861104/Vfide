// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./SharedInterfaces.sol";

/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                       SOCIAL GRAPH RECOVERY                               ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║  Trust-weighted account recovery using your social graph.                 ║
 * ║                                                                           ║
 * ║  Your network IS your security:                                           ║
 * ║  - Endorsers can vouch for your recovery                                  ║
 * ║  - Vouches are weighted by endorser's ProofScore                          ║
 * ║  - Higher trust = lower threshold needed                                  ║
 * ║  - Fraudulent vouches = score penalties for endorsers                     ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

error SGR_NotEnoughVouchWeight();
error SGR_AlreadyVouched();
error SGR_SelfVouchNotAllowed();
error SGR_NotEndorser();
error SGR_RecoveryExpired();
error SGR_NoActiveRecovery();
error SGR_RecoveryLocked();
error SGR_CooldownActive();
error SGR_NewAddressInvalid();
error SGR_Unauthorized();

interface ISeerFull {
    function getScore(address user) external view returns (uint256);
    function hasEndorsed(address endorser, address user) external view returns (bool);
    function getEndorsementCount(address user) external view returns (uint256);
    function applyPenalty(address user, uint256 amount, string calldata reason) external;
}

interface IGuardianRegistry {
    function updateOwner(address oldOwner, address newOwner) external;
}

contract SocialGraphRecovery {
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              CONSTANTS
    // ═══════════════════════════════════════════════════════════════════════
    
    uint256 public constant BASE_THRESHOLD = 5000;      // 50% of max score
    uint256 public constant HIGH_TRUST_THRESHOLD = 3000; // 30% for high-trust users
    uint256 public constant SCORE_SCALE = 10000;
    
    uint256 public constant RECOVERY_WINDOW = 7 days;
    uint256 public constant COOLDOWN_PERIOD = 30 days;
    uint256 public constant MIN_ENDORSERS = 3;
    
    uint256 public constant VOUCH_PENALTY = 500;        // Penalty for fraudulent vouch
    
    // ═══════════════════════════════════════════════════════════════════════
    //                               STRUCTS
    // ═══════════════════════════════════════════════════════════════════════
    
    struct RecoveryRequest {
        address oldAddress;
        address newAddress;
        uint256 vouchWeight;        // Accumulated weighted vouches
        uint256 createdAt;
        uint256 requiredWeight;     // Threshold based on user's score
        address[] vouchers;
        bool executed;
        bool contested;
    }
    
    struct UserSocialConfig {
        bool optedIn;               // User must opt-in to social recovery
        uint256 lastRecoveryAt;     // Cooldown tracking
        uint256 customThreshold;    // User can set higher threshold (0 = default)
        address[] trustedVouchers;  // Pre-approved vouchers (optional)
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              STATE
    // ═══════════════════════════════════════════════════════════════════════
    
    ISeerFull public seer;
    IGuardianRegistry public guardianRegistry;
    address public dao;
    
    mapping(address => RecoveryRequest) public activeRecoveries; // oldAddress => request
    mapping(address => UserSocialConfig) public userConfigs;
    mapping(address => mapping(address => bool)) private hasVouched; // oldAddress => voucher => bool
    
    event SocialRecoveryEnabled(address indexed user);
    event SocialRecoveryDisabled(address indexed user);
    event RecoveryInitiated(address indexed oldAddress, address indexed newAddress, uint256 requiredWeight);
    event VouchReceived(address indexed oldAddress, address indexed voucher, uint256 weight, uint256 totalWeight);
    event RecoveryExecuted(address indexed oldAddress, address indexed newAddress);
    event RecoveryCancelled(address indexed oldAddress);
    event RecoveryContested(address indexed oldAddress, address indexed contester);
    event FraudulentVouchPenalized(address indexed voucher, address indexed recoveredUser);
    
    // ═══════════════════════════════════════════════════════════════════════
    //                           CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════
    
    constructor(address _seer, address _guardianRegistry, address _dao) {
        require(_seer != address(0) && _guardianRegistry != address(0) && _dao != address(0));
        seer = ISeerFull(_seer);
        guardianRegistry = IGuardianRegistry(_guardianRegistry);
        dao = _dao;
    }
    
    modifier onlyDAO() {
        if (msg.sender != dao) revert SGR_Unauthorized();
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                         USER CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Enable social graph recovery for your account
     * @param customThreshold Higher threshold if desired (0 = default)
     * @param trustedVouchers Pre-approved vouchers who get bonus weight
     */
    function enableSocialRecovery(
        uint256 customThreshold,
        address[] calldata trustedVouchers
    ) external {
        UserSocialConfig storage config = userConfigs[msg.sender];
        config.optedIn = true;
        config.customThreshold = customThreshold;
        
        delete config.trustedVouchers;
        for (uint256 i = 0; i < trustedVouchers.length && i < 10; i++) {
            if (trustedVouchers[i] != address(0) && trustedVouchers[i] != msg.sender) {
                config.trustedVouchers.push(trustedVouchers[i]);
            }
        }
        
        emit SocialRecoveryEnabled(msg.sender);
    }
    
    /**
     * @notice Disable social recovery
     */
    function disableSocialRecovery() external {
        userConfigs[msg.sender].optedIn = false;
        emit SocialRecoveryDisabled(msg.sender);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                        INITIATE RECOVERY
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Start the recovery process for an account you're trying to recover
     * @param oldAddress The address you're recovering from
     * @param newAddress The new address you want to recover to
     */
    function initiateRecovery(address oldAddress, address newAddress) external {
        if (newAddress == address(0) || newAddress == oldAddress) revert SGR_NewAddressInvalid();
        
        UserSocialConfig storage config = userConfigs[oldAddress];
        if (!config.optedIn) revert SGR_Unauthorized();
        
        if (activeRecoveries[oldAddress].createdAt != 0) {
            if (block.timestamp < activeRecoveries[oldAddress].createdAt + RECOVERY_WINDOW) {
                revert SGR_RecoveryLocked();
            }
        }
        
        if (config.lastRecoveryAt != 0 && 
            block.timestamp < config.lastRecoveryAt + COOLDOWN_PERIOD) {
            revert SGR_CooldownActive();
        }
        
        // Calculate required weight based on user's score
        uint256 userScore = seer.getScore(oldAddress);
        uint256 requiredWeight = _calculateRequiredWeight(userScore, config.customThreshold);
        
        activeRecoveries[oldAddress] = RecoveryRequest({
            oldAddress: oldAddress,
            newAddress: newAddress,
            vouchWeight: 0,
            createdAt: block.timestamp,
            requiredWeight: requiredWeight,
            vouchers: new address[](0),
            executed: false,
            contested: false
        });
        
        emit RecoveryInitiated(oldAddress, newAddress, requiredWeight);
    }
    
    /**
     * @notice Vouch for someone's recovery (you must have endorsed them)
     * @param oldAddress The address being recovered
     */
    function vouchForRecovery(address oldAddress) external {
        RecoveryRequest storage request = activeRecoveries[oldAddress];
        
        if (request.createdAt == 0) revert SGR_NoActiveRecovery();
        if (block.timestamp > request.createdAt + RECOVERY_WINDOW) revert SGR_RecoveryExpired();
        if (msg.sender == oldAddress || msg.sender == request.newAddress) revert SGR_SelfVouchNotAllowed();
        if (hasVouched[oldAddress][msg.sender]) revert SGR_AlreadyVouched();
        
        // Must have endorsed the user
        if (!seer.hasEndorsed(msg.sender, oldAddress)) revert SGR_NotEndorser();
        
        hasVouched[oldAddress][msg.sender] = true;
        
        // Calculate vouch weight based on voucher's score
        uint256 voucherScore = seer.getScore(msg.sender);
        uint256 weight = voucherScore;
        
        // Bonus for pre-trusted vouchers
        UserSocialConfig storage config = userConfigs[oldAddress];
        for (uint256 i = 0; i < config.trustedVouchers.length; i++) {
            if (config.trustedVouchers[i] == msg.sender) {
                weight = weight * 150 / 100; // 50% bonus
                break;
            }
        }
        
        request.vouchWeight += weight;
        request.vouchers.push(msg.sender);
        
        emit VouchReceived(oldAddress, msg.sender, weight, request.vouchWeight);
    }
    
    /**
     * @notice Execute recovery when threshold is met
     */
    function executeRecovery(address oldAddress) external {
        RecoveryRequest storage request = activeRecoveries[oldAddress];
        
        if (request.createdAt == 0) revert SGR_NoActiveRecovery();
        if (block.timestamp > request.createdAt + RECOVERY_WINDOW) revert SGR_RecoveryExpired();
        if (request.executed) revert SGR_RecoveryExpired();
        if (request.contested) revert SGR_RecoveryLocked();
        if (request.vouchers.length < MIN_ENDORSERS) revert SGR_NotEnoughVouchWeight();
        if (request.vouchWeight < request.requiredWeight) revert SGR_NotEnoughVouchWeight();
        
        request.executed = true;
        userConfigs[oldAddress].lastRecoveryAt = block.timestamp;
        
        // Transfer ownership in guardian registry
        guardianRegistry.updateOwner(oldAddress, request.newAddress);
        
        emit RecoveryExecuted(oldAddress, request.newAddress);
        
        // Clean up vouch mappings
        for (uint256 i = 0; i < request.vouchers.length; i++) {
            delete hasVouched[oldAddress][request.vouchers[i]];
        }
    }
    
    /**
     * @notice The actual owner can cancel a fraudulent recovery attempt
     * @dev Penalizes all vouchers who falsely vouched
     */
    function contestRecovery() external {
        RecoveryRequest storage request = activeRecoveries[msg.sender];
        
        if (request.createdAt == 0) revert SGR_NoActiveRecovery();
        if (request.executed) revert SGR_RecoveryExpired();
        
        request.contested = true;
        
        // Penalize all vouchers for fraudulent vouch
        for (uint256 i = 0; i < request.vouchers.length; i++) {
            address voucher = request.vouchers[i];
            seer.applyPenalty(voucher, VOUCH_PENALTY, "Fraudulent recovery vouch");
            emit FraudulentVouchPenalized(voucher, msg.sender);
            delete hasVouched[msg.sender][voucher];
        }
        
        emit RecoveryContested(msg.sender, msg.sender);
        
        // Clear the request
        delete activeRecoveries[msg.sender];
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                         INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    function _calculateRequiredWeight(uint256 userScore, uint256 customThreshold) internal pure returns (uint256) {
        // Higher score users have lower threshold (they're trusted, easier to recover)
        // Lower score users need more vouches (harder to socially engineer)
        
        uint256 threshold = customThreshold > 0 ? customThreshold : BASE_THRESHOLD;
        
        if (userScore >= 8000) {
            // Very high trust: only need 30% weight
            threshold = threshold * 60 / 100;
        } else if (userScore >= 6000) {
            // High trust: 50% weight
            threshold = threshold * 80 / 100;
        } else if (userScore >= 4000) {
            // Medium trust: 100% weight
            // threshold stays the same
        } else {
            // Low trust: 150% weight needed
            threshold = threshold * 150 / 100;
        }
        
        return threshold;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                          VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    function getRecoveryStatus(address oldAddress) external view returns (
        bool active,
        address newAddress,
        uint256 vouchWeight,
        uint256 requiredWeight,
        uint256 voucherCount,
        uint256 expiresAt,
        bool canExecute
    ) {
        RecoveryRequest storage request = activeRecoveries[oldAddress];
        active = request.createdAt != 0 && !request.executed && !request.contested;
        newAddress = request.newAddress;
        vouchWeight = request.vouchWeight;
        requiredWeight = request.requiredWeight;
        voucherCount = request.vouchers.length;
        expiresAt = request.createdAt + RECOVERY_WINDOW;
        canExecute = active && 
                     vouchWeight >= requiredWeight && 
                     voucherCount >= MIN_ENDORSERS &&
                     block.timestamp <= expiresAt;
    }
    
    function getUserConfig(address user) external view returns (
        bool optedIn,
        uint256 lastRecoveryAt,
        uint256 customThreshold,
        address[] memory trustedVouchers
    ) {
        UserSocialConfig storage config = userConfigs[user];
        return (config.optedIn, config.lastRecoveryAt, config.customThreshold, config.trustedVouchers);
    }
    
    function hasUserVouched(address oldAddress, address voucher) external view returns (bool) {
        return hasVouched[oldAddress][voucher];
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              ADMIN
    // ═══════════════════════════════════════════════════════════════════════
    
    function setSeer(address _seer) external onlyDAO {
        require(_seer != address(0));
        seer = ISeerFull(_seer);
    }
    
    function setGuardianRegistry(address _registry) external onlyDAO {
        require(_registry != address(0));
        guardianRegistry = IGuardianRegistry(_registry);
    }
}
