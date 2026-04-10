// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * SubscriptionManager — Recurring Payments for Vfide
 * ------------------------------------------------
 * Allows merchants to pull funds automatically from user vaults
 * based on pre-approved subscription parameters.
 *
 * Features:
 * - Fixed amount recurring billing (e.g., 10 VFIDE / month)
 * - User can cancel anytime
 * - Merchant (or keeper) triggers the payment
 * - Pause/resume functionality for temporary suspension
 * - Grace period for failed payments
 * - Subscription modification support
 */

import "./SharedInterfaces.sol";

using SafeERC20 for IERC20;

// Seer interface for ProofScore
interface ISeer_SM {
    function reward(address subject, uint16 delta, string calldata reason) external;
}

error SM_NotSubscriber();
error SM_NotMerchant();
error SM_NotAuthorized();
error SM_InvalidAmount();
error SM_InvalidInterval();
error SM_InvalidMerchant();
error SM_InactiveSubscription();
error SM_AlreadyPaused();
error SM_NotPaused();
error SM_SubscriptionPaused();
error SM_PaymentTooEarly();
error SM_GracePeriodActive();
error SM_GracePeriodExpired();

contract SubscriptionManager is ReentrancyGuard {
    event SubscriptionCreated(uint256 indexed subId, address indexed subscriber, address indexed merchant, uint256 amount, uint256 interval);
    event SubscriptionCancelled(uint256 indexed subId);
    event SubscriptionPaused(uint256 indexed subId, address indexed pausedBy);
    event SubscriptionResumed(uint256 indexed subId, address indexed resumedBy);
    event SubscriptionModified(uint256 indexed subId, uint256 oldAmount, uint256 newAmount, uint256 oldInterval, uint256 newInterval);
    event PaymentProcessed(uint256 indexed subId, uint256 timestamp);
    event PaymentFailed(uint256 indexed subId, uint256 timestamp, string reason);
    event GracePeriodStarted(uint256 indexed subId, uint256 graceEndTime);
    event EmergencyCancelled(uint256 indexed subId, address indexed cancelledBy);
    event DAOSet(address indexed previousDAO, address indexed newDAO);

    struct Subscription {
        address subscriber;
        address merchant;
        address token;
        uint256 amount;
        uint256 interval; // seconds
        uint256 nextPayment;
        bool active;
        bool paused;           // NEW: Pause state
        uint256 pausedAt;      // NEW: When paused
        uint256 graceEndTime;  // NEW: Grace period end (0 = no grace)
        uint256 failedPayments; // NEW: Count of consecutive failed payments
        string memo; // e.g. "Netflix Premium"
    }

    uint256 public subCount;
    mapping(uint256 => Subscription) public subscriptions;
    
    // NEW: Configuration
    uint256 public constant GRACE_PERIOD = 3 days;
    uint256 public constant MAX_FAILED_PAYMENTS = 3;
    uint256 public constant MAX_BATCH_SIZE = 200;
    // Merchant has exclusive calling rights for 24h after payment is due.
    //               After this window anyone (keeper/bot) may process to prevent stalling.
    uint256 public constant MERCHANT_EXCLUSIVE_WINDOW = 24 hours;
    
    // NEW: DAO for emergency controls
    address public dao;
    
    IVaultHub public immutable vaultHub;
    
    // ProofScore integration
    ISeer_SM public seer;
    uint16 public constant SUBSCRIPTION_PAYER_REWARD = 2;    // +0.2 per payment
    uint16 public constant SUBSCRIPTION_MERCHANT_REWARD = 3; // +0.3 per payment

    modifier onlyDAO() {
        require(msg.sender == dao, "SM: not DAO");
        _;
    }

    constructor(address _vaultHub, address _dao, address _seer) {
        require(_vaultHub != address(0), "SM: zero vaultHub");
        require(_dao != address(0), "SM: zero DAO");
        vaultHub = IVaultHub(_vaultHub);
        dao = _dao;
        if (_seer != address(0)) seer = ISeer_SM(_seer);
    }
    
    /**
     * @notice Set Seer address (only DAO can change)
     */
    function setSeer(address _seer) external onlyDAO {
        seer = ISeer_SM(_seer);
    }
    
    /**
     * @notice Set DAO address (only current DAO can change)
     */
    function setDAO(address _dao) external onlyDAO {
        require(_dao != address(0), "SM: zero DAO");
        address previousDAO = dao;
        dao = _dao;
        emit DAOSet(previousDAO, _dao);
    }

    // 1. User creates a subscription
    function createSubscription(
        address merchant,
        address token,
        uint256 amount,
        uint256 interval,
        string calldata memo
    ) external returns (uint256 subId) {
        if (merchant == address(0)) revert SM_InvalidMerchant();
        if (amount == 0) revert SM_InvalidAmount();
        if (interval < 1 hours) revert SM_InvalidInterval();

        subId = ++subCount;
        subscriptions[subId] = Subscription({
            subscriber: msg.sender,
            merchant: merchant,
            token: token,
            amount: amount,
            interval: interval,
            nextPayment: block.timestamp, // Can pay immediately
            active: true,
            paused: false,
            pausedAt: 0,
            graceEndTime: 0,
            failedPayments: 0,
            memo: memo
        });

        emit SubscriptionCreated(subId, msg.sender, merchant, amount, interval);
    }

    // 2. User cancels subscription
    function cancelSubscription(uint256 subId) external {
        if (subscriptions[subId].subscriber != msg.sender) revert SM_NotSubscriber();
        subscriptions[subId].active = false;
        emit SubscriptionCancelled(subId);
    }
    
    /**
     * @notice Pause subscription temporarily (subscriber or merchant)
     * @dev Useful for disputes, temporary suspension, etc.
     */
    function pauseSubscription(uint256 subId) external {
        Subscription storage sub = subscriptions[subId];
        if (!sub.active) revert SM_InactiveSubscription();
        if (sub.paused) revert SM_AlreadyPaused();
        if (msg.sender != sub.subscriber && msg.sender != sub.merchant) revert SM_NotAuthorized();
        
        sub.paused = true;
        sub.pausedAt = block.timestamp;
        
        emit SubscriptionPaused(subId, msg.sender);
    }
    
    /**
     * @notice Resume paused subscription
     * @dev Only subscriber can resume (prevents merchant abuse)
     */
    function resumeSubscription(uint256 subId) external {
        Subscription storage sub = subscriptions[subId];
        if (!sub.active) revert SM_InactiveSubscription();
        if (!sub.paused) revert SM_NotPaused();
        if (msg.sender != sub.subscriber) revert SM_NotSubscriber();
        
        sub.paused = false;
        // Adjust next payment to avoid immediate charge after pause
        if (block.timestamp > sub.nextPayment) {
            sub.nextPayment = block.timestamp;
        }
        
        emit SubscriptionResumed(subId, msg.sender);
    }
    
    /**
     * @notice Modify subscription parameters
     * @dev Only subscriber can modify, takes effect after next payment
     */
    function modifySubscription(uint256 subId, uint256 newAmount, uint256 newInterval) external {
        Subscription storage sub = subscriptions[subId];
        if (msg.sender != sub.subscriber) revert SM_NotSubscriber();
        if (!sub.active) revert SM_InactiveSubscription();
        if (newAmount == 0) revert SM_InvalidAmount();
        if (newInterval < 1 hours) revert SM_InvalidInterval();
        
        uint256 oldAmount = sub.amount;
        uint256 oldInterval = sub.interval;
        
        sub.amount = newAmount;
        sub.interval = newInterval;
        
        emit SubscriptionModified(subId, oldAmount, newAmount, oldInterval, newInterval);
    }
    
    /**
     * @notice Emergency cancel by DAO (for fraud/disputes)
     */
    function emergencyCancel(uint256 subId) external onlyDAO {
        Subscription storage sub = subscriptions[subId];
        require(sub.active, "SM: already inactive");
        
        sub.active = false;
        emit EmergencyCancelled(subId, msg.sender);
    }

    // 3. Merchant (or anyone) processes the payment
    // Within MERCHANT_EXCLUSIVE_WINDOW after due time, only the merchant
    //                can call — prevents third-party griefing during brief balance dips.
    function _authorizeProcessor(Subscription storage sub, uint256 currentTime, address caller) internal view {
        if (currentTime < sub.nextPayment + MERCHANT_EXCLUSIVE_WINDOW) {
            if (caller != sub.merchant) revert SM_NotMerchant();
            return;
        }

        if (caller != sub.merchant && caller != sub.subscriber && caller != dao) {
            revert SM_NotAuthorized();
        }
    }

    function _handleFailedPayment(
        Subscription storage sub,
        uint256 subId,
        uint256 currentTime,
        uint256 allowance,
        uint256 balance
    ) internal returns (bool handled) {
        if (allowance >= sub.amount && balance >= sub.amount) {
            return false;
        }

        sub.failedPayments++;

        if (sub.failedPayments >= MAX_FAILED_PAYMENTS) {
            sub.active = false;
            emit PaymentFailed(subId, currentTime, "max failures reached");
            emit SubscriptionCancelled(subId);
            return true;
        }

        if (sub.graceEndTime == 0) {
            sub.graceEndTime = currentTime + GRACE_PERIOD;
            emit GracePeriodStarted(subId, sub.graceEndTime);
        }

        emit PaymentFailed(
            subId,
            currentTime,
            allowance < sub.amount ? "insufficient allowance" : "insufficient balance"
        );
        return true;
    }

    function _processPaymentInternal(
        Subscription storage sub,
        uint256 subId,
        address caller,
        uint256 currentTime
    ) internal returns (bool paid) {
        if (!sub.active) revert SM_InactiveSubscription();
        if (sub.paused) revert SM_SubscriptionPaused();
        if (currentTime < sub.nextPayment) revert SM_PaymentTooEarly();

        _authorizeProcessor(sub, currentTime, caller);

        if (sub.graceEndTime > 0 && currentTime > sub.graceEndTime) {
            sub.active = false;
            emit PaymentFailed(subId, currentTime, "grace period expired");
            emit SubscriptionCancelled(subId);
            return false;
        }

        address userVault = vaultHub.vaultOf(sub.subscriber);
        address merchantVault = vaultHub.vaultOf(sub.merchant);
        require(userVault != address(0), "no user vault");
        require(merchantVault != address(0), "no merchant vault");

        IERC20 token = IERC20(sub.token);
        uint256 allowance = token.allowance(userVault, address(this));
        uint256 balance = token.balanceOf(userVault);

        if (_handleFailedPayment(sub, subId, currentTime, allowance, balance)) {
            return false;
        }

        sub.graceEndTime = 0;
        sub.failedPayments = 0;
        sub.nextPayment += sub.interval;

        // slither-disable-next-line arbitrary-send-erc20
        token.safeTransferFrom(userVault, merchantVault, sub.amount);

        if (address(seer) != address(0)) {
            try seer.reward(sub.subscriber, SUBSCRIPTION_PAYER_REWARD, "subscription_payment") {} catch {}
            try seer.reward(sub.merchant, SUBSCRIPTION_MERCHANT_REWARD, "subscription_received") {} catch {}
        }

        emit PaymentProcessed(subId, currentTime);
        return true;
    }

    function processPayment(uint256 subId) external nonReentrant {
        Subscription storage sub = subscriptions[subId];
        _processPaymentInternal(sub, subId, msg.sender, Time.timestamp());
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    function getSubscription(uint256 subId) external view returns (Subscription memory) {
        return subscriptions[subId];
    }
    
    /**
     * @notice Get next payment info for UI
     */
    function getNextPaymentInfo(uint256 subId) external view returns (
        uint256 nextPaymentTime,
        uint256 amount,
        bool isPaused,
        bool isInGracePeriod,
        uint256 graceTimeRemaining,
        uint256 failedPaymentCount
    ) {
        Subscription storage sub = subscriptions[subId];
        nextPaymentTime = sub.nextPayment;
        amount = sub.amount;
        isPaused = sub.paused;
        isInGracePeriod = sub.graceEndTime > 0 && block.timestamp <= sub.graceEndTime;
        graceTimeRemaining = sub.graceEndTime > block.timestamp ? sub.graceEndTime - block.timestamp : 0;
        failedPaymentCount = sub.failedPayments;
    }
    
    /**
     * @notice Check if subscription can be processed now
     */
    function canProcess(uint256 subId) external view returns (bool processable, string memory reason) {
        Subscription storage sub = subscriptions[subId];
        
        if (!sub.active) return (false, "inactive");
        if (sub.paused) return (false, "paused");
        if (block.timestamp < sub.nextPayment) return (false, "too early");
        if (sub.graceEndTime > 0 && block.timestamp > sub.graceEndTime) return (false, "grace expired");
        
        address userVault = vaultHub.vaultOf(sub.subscriber);
        if (userVault == address(0)) return (false, "no vault");
        
        uint256 allowance = IERC20(sub.token).allowance(userVault, address(this));
        uint256 balance = IERC20(sub.token).balanceOf(userVault);
        
        if (allowance < sub.amount) return (false, "insufficient allowance");
        if (balance < sub.amount) return (false, "insufficient balance");
        
        return (true, "ready");
    }
    
    /**
     * @notice Get all subscriptions for a user
     */
    function getUserSubscriptions(address user) external view returns (uint256[] memory) {
        // Count first
        uint256 count = 0;
        for (uint256 i = 1; i <= subCount; i++) {
            if (subscriptions[i].subscriber == user) count++;
        }
        
        // Collect
        uint256[] memory result = new uint256[](count);
        uint256 idx = 0;
        for (uint256 i = 1; i <= subCount; i++) {
            if (subscriptions[i].subscriber == user) {
                result[idx++] = i;
            }
        }
        return result;
    }
    
    /**
     * @notice Get all subscriptions for a merchant
     */
    function getMerchantSubscriptions(address merchant) external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 1; i <= subCount; i++) {
            if (subscriptions[i].merchant == merchant) count++;
        }
        
        uint256[] memory result = new uint256[](count);
        uint256 idx = 0;
        for (uint256 i = 1; i <= subCount; i++) {
            if (subscriptions[i].merchant == merchant) {
                result[idx++] = i;
            }
        }
        return result;
    }
    
    /**
     * @notice Get merchant subscription statistics
     */
    function getMerchantStats(address merchant) external view returns (
        uint256 totalSubscriptions,
        uint256 activeCount,
        uint256 pausedCount,
        uint256 totalMRR,  // Monthly Recurring Revenue (assumes 30-day interval)
        uint256 totalValuePerInterval
    ) {
        for (uint256 i = 1; i <= subCount; i++) {
            Subscription storage sub = subscriptions[i];
            if (sub.merchant == merchant) {
                totalSubscriptions++;
                if (sub.active) {
                    if (sub.paused) {
                        pausedCount++;
                    } else {
                        activeCount++;
                        totalValuePerInterval += sub.amount;
                        // Normalize to monthly (30 days)
                        if (sub.interval > 0) {
                            totalMRR += (sub.amount * 30 days) / sub.interval;
                        }
                    }
                }
            }
        }
    }
    
    /// @notice Internal pre-check used by keeper batches to skip obviously invalid subscriptions.
    function _isBatchProcessable(Subscription storage sub, uint256 currentTime, address caller) internal view returns (bool) {
        if (!sub.active || sub.paused || currentTime < sub.nextPayment) {
            return false;
        }
        if (sub.graceEndTime > 0 && currentTime > sub.graceEndTime) {
            return true;
        }
        if (currentTime < sub.nextPayment + MERCHANT_EXCLUSIVE_WINDOW) {
            return caller == sub.merchant;
        }
        return caller == sub.merchant || caller == sub.subscriber || caller == dao;
    }

    /**
     * @notice Batch process multiple subscription payments (gas efficient for keepers)
     * @param subIds Array of subscription IDs to process
     * @return processed Number of successfully processed payments
     * @return failed Number of failed payments
     */
    function batchProcessPayments(uint256[] calldata subIds) external nonReentrant returns (
        uint256 processed,
        uint256 failed
    ) {
        require(subIds.length <= MAX_BATCH_SIZE, "SM: batch too large");
        uint256 currentTime = Time.timestamp();

        for (uint256 i = 0; i < subIds.length; i++) {
            uint256 subId = subIds[i];
            Subscription storage sub = subscriptions[subId];

            if (!_isBatchProcessable(sub, currentTime, msg.sender)) {
                failed++;
                continue;
            }

            bool paid = _processPaymentInternal(sub, subId, msg.sender, currentTime);
            if (paid) {
                processed++;
            } else {
                failed++;
            }
        }
    }
    
    /**
     * @notice Get all subscriptions ready for processing (for keepers)
     * @return ready Array of subscription IDs that can be processed
     */
    function getReadyForProcessing() external view returns (uint256[] memory ready) {
        // Count first
        uint256 count = 0;
        for (uint256 i = 1; i <= subCount; i++) {
            Subscription storage sub = subscriptions[i];
            if (sub.active && !sub.paused && block.timestamp >= sub.nextPayment) {
                if (sub.graceEndTime == 0 || block.timestamp <= sub.graceEndTime) {
                    count++;
                }
            }
        }
        
        // Collect
        ready = new uint256[](count);
        uint256 idx = 0;
        for (uint256 i = 1; i <= subCount; i++) {
            Subscription storage sub = subscriptions[i];
            if (sub.active && !sub.paused && block.timestamp >= sub.nextPayment) {
                if (sub.graceEndTime == 0 || block.timestamp <= sub.graceEndTime) {
                    ready[idx++] = i;
                }
            }
        }
    }
    
    /**
     * @notice Batch get subscription details
     */
    function getSubscriptionsBatch(uint256[] calldata subIds) external view returns (Subscription[] memory results) {
        results = new Subscription[](subIds.length);
        for (uint256 i = 0; i < subIds.length; i++) {
            results[i] = subscriptions[subIds[i]];
        }
    }
}
