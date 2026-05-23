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

import {IVaultHub, IERC20, IEmergencyBreaker, ReentrancyGuard, SafeERC20} from "../SharedInterfaces.sol";

using SafeERC20 for IERC20;

// Seer interface for ProofScore
/// @notice ISeer_SM
/// @title ISeer_SM
/// @author Vfide
interface ISeer_SM {
    /// @notice reward
    /// @param subject subject
    /// @param delta delta
    /// @param reason reason
    function reward(address subject, uint16 delta, string calldata reason) external;
}

/// @notice IFraudRegistry_SM
/// @title IFraudRegistry_SM
/// @author Vfide
interface IFraudRegistry_SM {
    /// @notice isServiceBanned
    /// @param user user
    /// @return _bool _bool
    function isServiceBanned(address user) external view returns (bool);
}

/// @dev R-4 — narrow interface used only by settleByInheritance. Kept separate
///      from the broader IVaultHub in SharedInterfaces.sol so this contract's
///      ABI changes are scoped to its own settlement path.
/// @notice IVaultHubInheritance_SM
/// @title IVaultHubInheritance_SM
/// @author Vfide
interface IVaultHubInheritance_SM {
    /// @notice isInMemorialState
    /// @param vault vault
    /// @return _bool _bool
    function isInMemorialState(address vault) external view returns (bool);
}

/// @notice SM_NotSubscriber
error SM_NotSubscriber();
/// @notice SM_NotMerchant
error SM_NotMerchant();
/// @notice SM_NotAuthorized
error SM_NotAuthorized();
/// @notice SM_InvalidAmount
error SM_InvalidAmount();
/// @notice SM_InvalidInterval
error SM_InvalidInterval();
/// @notice SM_InvalidMerchant
error SM_InvalidMerchant();
/// @notice SM_InactiveSubscription
error SM_InactiveSubscription();
/// @notice SM_AlreadyPaused
error SM_AlreadyPaused();
/// @notice SM_NotPaused
error SM_NotPaused();
/// @notice SM_SubscriptionPaused
error SM_SubscriptionPaused();
/// @notice SM_PaymentTooEarly
error SM_PaymentTooEarly();
/// @notice SM_GracePeriodActive
error SM_GracePeriodActive();
/// @notice SM_GracePeriodExpired
error SM_GracePeriodExpired();
/// @notice SM_EmergencyNotActive
error SM_EmergencyNotActive();
/// @notice SM_VaultChanged
error SM_VaultChanged();
/// @notice SM_FraudBlocked
error SM_FraudBlocked();
/// @notice R-4 — neither party's vault is in MEMORIAL state.
error SM_NotInheritanceActive();

/// @notice SubscriptionManager
/// @title SubscriptionManager
/// @author Vfide
contract SubscriptionManager is ReentrancyGuard {
    /// @notice SubscriptionCreated
    /// @param subId subId
    /// @param subscriber subscriber
    /// @param merchant merchant
    /// @param amount amount
    /// @param interval interval
    event SubscriptionCreated(uint256 indexed subId, address indexed subscriber, address indexed merchant, uint256 amount, uint256 interval);
    /// @notice SubscriptionCancelled
    /// @param subId subId
    event SubscriptionCancelled(uint256 indexed subId);
    /// @notice R-4 — emitted when a subscription is cancelled because one party's vault entered MEMORIAL.
    /// @param subId subId
    /// @param deceasedParty deceasedParty
    event SubscriptionSettledByInheritance(uint256 indexed subId, address indexed deceasedParty);
    /// @notice SubscriptionPaused
    /// @param subId subId
    /// @param pausedBy pausedBy
    event SubscriptionPaused(uint256 indexed subId, address indexed pausedBy);
    /// @notice SubscriptionResumed
    /// @param subId subId
    /// @param resumedBy resumedBy
    event SubscriptionResumed(uint256 indexed subId, address indexed resumedBy);
    /// @notice SubscriptionModified
    /// @param subId subId
    /// @param oldAmount oldAmount
    /// @param newAmount newAmount
    /// @param oldInterval oldInterval
    /// @param newInterval newInterval
    event SubscriptionModified(uint256 indexed subId, uint256 oldAmount, uint256 newAmount, uint256 oldInterval, uint256 newInterval);
    /// @notice PaymentProcessed
    /// @param subId subId
    /// @param timestamp timestamp
    event PaymentProcessed(uint256 indexed subId, uint256 timestamp);
    /// @notice PaymentFailed
    /// @param subId subId
    /// @param timestamp timestamp
    /// @param reason reason
    event PaymentFailed(uint256 indexed subId, uint256 timestamp, string reason);
    /// @notice SeerRewardFailed
    /// @param subId subId
    /// @param subject subject
    /// @param reason reason
    event SeerRewardFailed(uint256 indexed subId, address indexed subject, string reason);
    /// @notice GracePeriodStarted
    /// @param subId subId
    /// @param graceEndTime graceEndTime
    event GracePeriodStarted(uint256 indexed subId, uint256 graceEndTime);
    /// @notice EmergencyCancelled
    /// @param subId subId
    /// @param cancelledBy cancelledBy
    event EmergencyCancelled(uint256 indexed subId, address indexed cancelledBy);
    /// @notice EmergencyCancelQueued
    /// @param subId subId
    /// @param effectiveAt effectiveAt
    event EmergencyCancelQueued(uint256 indexed subId, uint64 effectiveAt);
    /// @notice EmergencyCancelRevoked
    /// @param subId subId
    event EmergencyCancelRevoked(uint256 indexed subId);
    /// @notice EmergencyBreakerChangeQueued
    /// @param breaker breaker
    /// @param effectiveAt effectiveAt
    event EmergencyBreakerChangeQueued(address indexed breaker, uint64 effectiveAt);
    /// @notice EmergencyBreakerChangeApplied
    /// @param breaker breaker
    event EmergencyBreakerChangeApplied(address indexed breaker);
    /// @notice EmergencyBreakerChangeCancelled
    /// @param breaker breaker
    event EmergencyBreakerChangeCancelled(address indexed breaker);
    /// @notice FraudRegistrySet
    /// @param fraudRegistry fraudRegistry
    event FraudRegistrySet(address indexed fraudRegistry);
    /// @notice FraudRegistryChangeQueued
    /// @param fraudRegistry fraudRegistry
    /// @param effectiveAt effectiveAt
    event FraudRegistryChangeQueued(address indexed fraudRegistry, uint64 effectiveAt);
    /// @notice FraudRegistryChangeApplied
    /// @param fraudRegistry fraudRegistry
    event FraudRegistryChangeApplied(address indexed fraudRegistry);
    /// @notice FraudRegistryChangeCancelled
    /// @param fraudRegistry fraudRegistry
    event FraudRegistryChangeCancelled(address indexed fraudRegistry);

    struct Subscription {
        address subscriber;
        address merchant;
        address subscriberVault;
        address merchantVault;
        address token;
        uint256 amount;
        uint256 interval; // seconds
        uint256 nextPayment;
        bool active;
        bool paused; // NEW: Pause state
        uint256 pausedAt; // NEW: When paused
        uint256 graceEndTime; // NEW: Grace period end (0 = no grace)
        uint256 failedPayments; // NEW: Count of consecutive failed payments
        uint256 lastFailedPaymentBlock; // N-H12 FIX: prevent same-block failure spam increments
        string memo; // e.g. "Netflix Premium"
    }

    /// @notice subCount
    uint256 public subCount;
    /// @notice subscriptions
    mapping(uint256 => Subscription) public subscriptions;

    // NEW: Configuration
    /// @notice GRACE_PERIOD
    uint256 public constant GRACE_PERIOD = 3 days;
    /// @notice MAX_FAILED_PAYMENTS
    uint256 public constant MAX_FAILED_PAYMENTS = 3;
    /// @notice MAX_BATCH_SIZE
    uint256 public constant MAX_BATCH_SIZE = 200;
    // Merchant has exclusive calling rights for 24h after payment is due.
    //               After this window anyone (keeper/bot) may process to prevent stalling.
    /// @notice MERCHANT_EXCLUSIVE_WINDOW
    uint256 public constant MERCHANT_EXCLUSIVE_WINDOW = 24 hours;

    // NEW: DAO for emergency controls
    /// @notice dao
    address public dao;
    /// @notice emergencyBreaker
    IEmergencyBreaker public emergencyBreaker;
    // #515 FIX: Timelock emergency cancellation so subscriber has 48h notice.
    /// @notice EMERGENCY_CANCEL_DELAY
    uint64 public constant EMERGENCY_CANCEL_DELAY = 48 hours;
    /// @notice pendingEmergencyCancelAt
    mapping(uint256 => uint64) public pendingEmergencyCancelAt;
    /// @notice pendingEmergencyBreaker
    address public pendingEmergencyBreaker;
    /// @notice pendingEmergencyBreakerAt
    uint64 public pendingEmergencyBreakerAt;
    /// @notice BREAKER_CHANGE_DELAY
    uint64 public constant BREAKER_CHANGE_DELAY = 48 hours;
    /// @notice pendingFraudRegistry
    address public pendingFraudRegistry;
    /// @notice pendingFraudRegistryAt
    uint64 public pendingFraudRegistryAt;
    /// @notice FRAUD_REGISTRY_CHANGE_DELAY
    uint64 public constant FRAUD_REGISTRY_CHANGE_DELAY = 24 hours;
    
    /// @notice vaultHub
    IVaultHub public vaultHub;

    // ProofScore integration
    /// @notice seer
    ISeer_SM public seer;
    /// @notice fraudRegistry
    IFraudRegistry_SM public fraudRegistry;
    /// @notice SUBSCRIPTION_PAYER_REWARD
    uint16 public constant SUBSCRIPTION_PAYER_REWARD = 2;    // +0.2 per payment
    /// @notice SUBSCRIPTION_MERCHANT_REWARD
    uint16 public constant SUBSCRIPTION_MERCHANT_REWARD = 3; // +0.3 per payment

    /// @notice onlyDAO
    modifier onlyDAO() {
        require(msg.sender == dao, "SM: not DAO");
        _;
    }

    /// @notice constructor
    /// @param _vaultHub _vaultHub
    /// @param _dao _dao
    /// @param _seer _seer
    constructor(address _vaultHub, address _dao, address _seer) {
        require(_vaultHub != address(0), "SM: zero vaultHub");
        require(_dao != address(0), "SM: zero DAO");
        vaultHub = IVaultHub(_vaultHub);
        dao = _dao;
        if (_seer != address(0)) seer = ISeer_SM(_seer);
    }

    /**
     * @notice Set Seer address (only DAO can change)
     * @param _seer _seer
     */
    function setSeer(address _seer) external onlyDAO {
        seer = ISeer_SM(_seer);
    }

    /// @notice setFraudRegistry
    /// @param _fraudRegistry _fraudRegistry
    function setFraudRegistry(address _fraudRegistry) external onlyDAO {
        require(_fraudRegistry != address(0), "SM: zero fraud registry");
        require(pendingFraudRegistryAt == 0, "SM: pending fraud registry");

        pendingFraudRegistry = _fraudRegistry;
        pendingFraudRegistryAt = uint64(block.timestamp) + FRAUD_REGISTRY_CHANGE_DELAY;
        emit FraudRegistryChangeQueued(_fraudRegistry, pendingFraudRegistryAt);
    }

    /// @notice applyFraudRegistry
    function applyFraudRegistry() external onlyDAO {
        require(pendingFraudRegistryAt != 0, "SM: no pending fraud registry");
        require(block.timestamp >= pendingFraudRegistryAt, "SM: fraud registry timelock");

        fraudRegistry = IFraudRegistry_SM(pendingFraudRegistry);
        emit FraudRegistrySet(pendingFraudRegistry);
        emit FraudRegistryChangeApplied(pendingFraudRegistry);

        delete pendingFraudRegistry;
        delete pendingFraudRegistryAt;
    }

    /// @notice cancelFraudRegistryChange
    function cancelFraudRegistryChange() external onlyDAO {
        require(pendingFraudRegistryAt != 0, "SM: no pending fraud registry");
        emit FraudRegistryChangeCancelled(pendingFraudRegistry);
        delete pendingFraudRegistry;
        delete pendingFraudRegistryAt;
    }

    /**
     * @notice Set DAO address (only current DAO can change)
     * @param _dao _dao
     */
    function setDAO(address _dao) external onlyDAO {
        require(_dao != address(0), "SM: zero DAO");
        dao = _dao;
    }

    /// @notice setEmergencyBreaker
    /// @param _breaker _breaker
    function setEmergencyBreaker(address _breaker) external onlyDAO {
        require(_breaker != address(0), "SM: zero breaker");
        require(pendingEmergencyBreakerAt == 0, "SM: pending breaker");

        pendingEmergencyBreaker = _breaker;
        pendingEmergencyBreakerAt = uint64(block.timestamp) + BREAKER_CHANGE_DELAY;
        emit EmergencyBreakerChangeQueued(_breaker, pendingEmergencyBreakerAt);
    }

    /// @notice applyEmergencyBreaker
    function applyEmergencyBreaker() external onlyDAO {
        require(pendingEmergencyBreakerAt != 0, "SM: no pending breaker");
        require(block.timestamp >= pendingEmergencyBreakerAt, "SM: breaker timelock");

        emergencyBreaker = IEmergencyBreaker(pendingEmergencyBreaker);
        emit EmergencyBreakerChangeApplied(pendingEmergencyBreaker);

        delete pendingEmergencyBreaker;
        delete pendingEmergencyBreakerAt;
    }

    /// @notice cancelEmergencyBreakerChange
    function cancelEmergencyBreakerChange() external onlyDAO {
        require(pendingEmergencyBreakerAt != 0, "SM: no pending breaker");
        emit EmergencyBreakerChangeCancelled(pendingEmergencyBreaker);
        delete pendingEmergencyBreaker;
        delete pendingEmergencyBreakerAt;
    }

    // 1. User creates a subscription
    /// @notice createSubscription
    /// @param merchant merchant
    /// @param token token
    /// @param amount amount
    /// @param interval interval
    /// @param memo memo
    /// @return subId subId
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

        address subscriberVault = vaultHub.vaultOf(msg.sender);
        address merchantVault = vaultHub.vaultOf(merchant);
        if (subscriberVault == address(0) || merchantVault == address(0)) revert SM_VaultChanged();

        subId = ++subCount;
        subscriptions[subId] = Subscription({
            subscriber: msg.sender,
            merchant: merchant,
            subscriberVault: subscriberVault,
            merchantVault: merchantVault,
            token: token,
            amount: amount,
            interval: interval,
            nextPayment: block.timestamp, // Can pay immediately
            active: true,
            paused: false,
            pausedAt: 0,
            graceEndTime: 0,
            failedPayments: 0,
            lastFailedPaymentBlock: 0,
            memo: memo
        });

        emit SubscriptionCreated(subId, msg.sender, merchant, amount, interval);
    }

    // 2. User cancels subscription
    /// @notice cancelSubscription
    /// @param subId subId
    function cancelSubscription(uint256 subId) external {
        if (subscriptions[subId].subscriber != msg.sender) revert SM_NotSubscriber();
        subscriptions[subId].active = false;
        emit SubscriptionCancelled(subId);
    }

    /// @notice R-4 — Settle a subscription when one party's vault has entered MEMORIAL state.
    ///
    /// Pull-based settlement. Permissionless: anyone (heirs, the surviving counterparty,
    /// keeper bots) can call this once the subscriber or merchant's vault is in MEMORIAL
    /// (state 3) or CLOSED (state 4). Effect: subscription is marked inactive — same
    /// terminal state as `cancelSubscription` — and no further payments will process.
    ///
    /// Why this is safe + necessary:
    ///   - If the SUBSCRIBER died, future processPayment calls would attempt to pull
    ///     funds from a vault that's already in MEMORIAL. Those pulls would be blocked
    ///     by the vault's outbound-transfer guard, but the failed-payment counter would
    ///     creep up (and may credit a fraud signal). Cleanly cancelling avoids that
    ///     and frees the merchant from monitoring.
    ///   - If the MERCHANT died, future payments would land in a vault that's no
    ///     longer being actively managed for inbound flow. Cancelling here ensures
    ///     the subscriber doesn't keep paying a vault whose owner is gone.
    ///
    /// State transitions:
    ///   - active=true,paused=false → active=false. SubscriptionCancelled + SubscriptionSettledByInheritance.
    ///   - active=true,paused=true → active=false (unpause-and-cancel is idempotent).
    ///   - already inactive → revert with SM_InactiveSubscription.
    ///
    /// @param subId Subscription identifier.
    function settleByInheritance(uint256 subId) external nonReentrant {
        Subscription storage sub = subscriptions[subId];
        if (!sub.active) revert SM_InactiveSubscription();

        // Probe both parties' vaults via the existing vaultHub. We cast through
        // the narrow interface that exposes isInMemorialState (the broader
        // IVaultHub in SharedInterfaces.sol doesn't expose it yet — adding it
        // there would force every other consumer to recompile).
        IVaultHubInheritance_SM probe = IVaultHubInheritance_SM(address(vaultHub));
        address subscriberVaultLive = vaultHub.vaultOf(sub.subscriber);
        address merchantVaultLive = vaultHub.vaultOf(sub.merchant);
        address deceasedParty = address(0);
        if (subscriberVaultLive != address(0) && probe.isInMemorialState(subscriberVaultLive)) {
            deceasedParty = sub.subscriber;
        } else if (merchantVaultLive != address(0) && probe.isInMemorialState(merchantVaultLive)) {
            deceasedParty = sub.merchant;
        } else {
            revert SM_NotInheritanceActive();
        }

        sub.active = false;
        emit SubscriptionCancelled(subId);
        emit SubscriptionSettledByInheritance(subId, deceasedParty);
    }

    /**
     * @notice Pause subscription temporarily (subscriber or merchant)
     * @dev Useful for disputes, temporary suspension, etc.
     * @param subId subId
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
     * @param subId subId
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
     * @param subId subId
     * @param newAmount newAmount
     * @param newInterval newInterval
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
     * @notice Propose emergency cancel by DAO (for fraud/disputes)
     * @dev #515 FIX: 48h notice before cancellation finalises.
     * @param subId subId
     */
    function emergencyCancel(uint256 subId) external onlyDAO {
        Subscription storage sub = subscriptions[subId];
        require(sub.active, "SM: already inactive");
        require(pendingEmergencyCancelAt[subId] == 0, "SM: cancel already queued");

        if (address(emergencyBreaker) == address(0) || !emergencyBreaker.halted()) {
            revert SM_EmergencyNotActive();
        }

        uint64 effectiveAt = uint64(block.timestamp) + EMERGENCY_CANCEL_DELAY;
        pendingEmergencyCancelAt[subId] = effectiveAt;
        emit EmergencyCancelQueued(subId, effectiveAt);
    }

    /// @notice applyEmergencyCancel
    /// @param subId subId
    function applyEmergencyCancel(uint256 subId) external onlyDAO {
        Subscription storage sub = subscriptions[subId];
        require(sub.active, "SM: already inactive");
        require(pendingEmergencyCancelAt[subId] != 0 && block.timestamp >= pendingEmergencyCancelAt[subId], "SM: timelock");
        delete pendingEmergencyCancelAt[subId];
        sub.active = false;
        emit EmergencyCancelled(subId, msg.sender);
    }

    /// @notice revokeEmergencyCancel
    /// @param subId subId
    function revokeEmergencyCancel(uint256 subId) external onlyDAO {
        require(pendingEmergencyCancelAt[subId] != 0, "SM: no pending cancel");
        delete pendingEmergencyCancelAt[subId];
        emit EmergencyCancelRevoked(subId);
    }

    // 3. Merchant (or anyone) processes the payment
    // Within MERCHANT_EXCLUSIVE_WINDOW after due time, only the merchant
    //                can call — prevents third-party griefing during brief balance dips.
    /// @notice processPayment
    /// @param subId subId
    function processPayment(uint256 subId) external nonReentrant {
        Subscription storage sub = subscriptions[subId];
        if (!sub.active) revert SM_InactiveSubscription();
        if (sub.paused) revert SM_SubscriptionPaused(); // Cannot process while paused
        if (block.timestamp < sub.nextPayment) revert SM_PaymentTooEarly();

        if (address(fraudRegistry) != address(0)) {
            if (fraudRegistry.isServiceBanned(sub.subscriber) || fraudRegistry.isServiceBanned(sub.merchant)) {
                revert SM_FraudBlocked();
            }
        }

        // During the merchant-exclusive window only the merchant may trigger.
        if (block.timestamp < sub.nextPayment + MERCHANT_EXCLUSIVE_WINDOW) {
            if (msg.sender != sub.merchant) revert SM_NotMerchant();
        } else {
            // After the exclusive window, only merchant/subscriber/DAO may trigger.
            if (msg.sender != sub.merchant && msg.sender != sub.subscriber && msg.sender != dao) {
                revert SM_NotAuthorized();
            }
        }

        // Check grace period
        if (sub.graceEndTime > 0 && block.timestamp > sub.graceEndTime) {
            // Grace period expired, auto-cancel
            sub.active = false;
            emit SubscriptionCancelled(subId);
            revert SM_GracePeriodExpired();
        }

        // Get Vaults
        address userVault = vaultHub.vaultOf(sub.subscriber);
        address merchantVault = vaultHub.vaultOf(sub.merchant);
        require(userVault != address(0), "no user vault");
        require(merchantVault != address(0), "no merchant vault");

        // Defense in depth: subscription pulls are only valid while the stored
        // vault mappings remain unchanged for subscriber and merchant.
        if (userVault != sub.subscriberVault || merchantVault != sub.merchantVault) {
            revert SM_VaultChanged();
        }

        // Check allowance and balance
        uint256 allowance = IERC20(sub.token).allowance(userVault, address(this));
        uint256 balance = IERC20(sub.token).balanceOf(userVault);

        // NEW: Grace period handling for insufficient funds
        if (allowance < sub.amount || balance < sub.amount) {
            // N-H12 FIX: Count at most one failed payment per block for this subscription.
            // Prevents merchants from calling processPayment 3x in the same block to force
            // immediate auto-cancellation.
            if (sub.lastFailedPaymentBlock != block.number) {
                ++sub.failedPayments;
                sub.lastFailedPaymentBlock = block.number;
            }

            if (sub.failedPayments >= MAX_FAILED_PAYMENTS) {
                // Too many failures, cancel subscription
                sub.active = false;
                emit PaymentFailed(subId, block.timestamp, "max failures reached");
                emit SubscriptionCancelled(subId);
                return;
            }

            // Start or extend grace period
            if (sub.graceEndTime == 0) {
                sub.graceEndTime = block.timestamp + GRACE_PERIOD;
                emit GracePeriodStarted(subId, sub.graceEndTime);
            }

            emit PaymentFailed(subId, block.timestamp, allowance < sub.amount ? "insufficient allowance" : "insufficient balance");
            return;
        }

        // Reset grace period and failed payments on successful payment
        sub.graceEndTime = 0;
        sub.failedPayments = 0;

        // Update next payment time FIRST (reentrancy protection pattern)
        sub.nextPayment += sub.interval;

        // This pull uses user vault custody by design (not arbitrary user-provided from-address).
        // Execute Transfer (using SafeERC20 for non-standard tokens)
        IERC20(sub.token).safeTransferFrom(userVault, merchantVault, sub.amount);

        // Reward ProofScore for successful subscription payment
        if (address(seer) != address(0)) {
            try seer.reward(sub.subscriber, SUBSCRIPTION_PAYER_REWARD, "subscription_payment") {} catch {
                emit SeerRewardFailed(subId, sub.subscriber, "subscription_payment");
            }
            try seer.reward(sub.merchant, SUBSCRIPTION_MERCHANT_REWARD, "subscription_received") {} catch {
                emit SeerRewardFailed(subId, sub.merchant, "subscription_received");
            }
        }

        emit PaymentProcessed(subId, block.timestamp);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                              VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    /// @notice getSubscription
    /// @param subId subId
    function getSubscription(uint256 subId) external view returns (Subscription memory) {
        return subscriptions[subId];
    }

    /**
     * @notice Get next payment info for UI
     * @param subId subId
     * @return nextPaymentTime nextPaymentTime
     * @return amount amount
     * @return isPaused isPaused
     * @return isInGracePeriod isInGracePeriod
     * @return graceTimeRemaining graceTimeRemaining
     * @return failedPaymentCount failedPaymentCount
     */
    function getNextPaymentInfo(
        uint256 subId
    ) external view returns (uint256 nextPaymentTime, uint256 amount, bool isPaused, bool isInGracePeriod, uint256 graceTimeRemaining, uint256 failedPaymentCount) {
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
     * @param subId subId
     * @return processable processable
     * @return reason reason
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
     * @param user user
     */
    function getUserSubscriptions(address user) external view returns (uint256[] memory) {
        // Count first
        uint256 count = 0;
        for (uint256 i = 1; i <= subCount; ++i) {
            if (subscriptions[i].subscriber == user) ++count;
        }

        // Collect
        uint256[] memory result = new uint256[](count);
        uint256 idx = 0;
        for (uint256 i = 1; i <= subCount; ++i) {
            if (subscriptions[i].subscriber == user) {
                result[idx++] = i;
            }
        }
        return result;
    }

    /**
     * @notice Get all subscriptions for a merchant
     * @param merchant merchant
     */
    function getMerchantSubscriptions(address merchant) external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 1; i <= subCount; ++i) {
            if (subscriptions[i].merchant == merchant) ++count;
        }

        uint256[] memory result = new uint256[](count);
        uint256 idx = 0;
        for (uint256 i = 1; i <= subCount; ++i) {
            if (subscriptions[i].merchant == merchant) {
                result[idx++] = i;
            }
        }
        return result;
    }

    /**
     * @notice Get merchant subscription statistics
     * @param merchant merchant
     * @return totalSubscriptions totalSubscriptions
     * @return activeCount activeCount
     * @return pausedCount pausedCount
     * @return totalMRR totalMRR
     * @return totalValuePerInterval totalValuePerInterval
     */
    function getMerchantStats(address merchant) external view returns (
        uint256 totalSubscriptions,
        uint256 activeCount,
        uint256 pausedCount,
        uint256 totalMRR,  // Monthly Recurring Revenue (assumes 30-day interval)
        uint256 totalValuePerInterval
    ) {
        for (uint256 i = 1; i <= subCount; ++i) {
            Subscription storage sub = subscriptions[i];
            if (sub.merchant == merchant) {
                ++totalSubscriptions;
                if (sub.active) {
                    if (sub.paused) {
                        ++pausedCount;
                    } else {
                        ++activeCount;
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

    /**
     * @notice Batch process multiple subscription payments (gas efficient for keepers)
     * @param subIds Array of subscription IDs to process
     * @return processed Number of successfully processed payments
     * @return failed Number of failed payments
     */
    function batchProcessPayments(uint256[] calldata subIds) external returns (uint256 processed, uint256 failed) {
        require(subIds.length <= MAX_BATCH_SIZE, "SM: batch too large");
        for (uint256 i = 0; i < subIds.length; ++i) {
            try this.processPayment(subIds[i]) {
                ++processed;
            } catch {
                ++failed;
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
        for (uint256 i = 1; i <= subCount; ++i) {
            Subscription storage sub = subscriptions[i];
            if (sub.active && !sub.paused && block.timestamp >= sub.nextPayment) {
                if (sub.graceEndTime == 0 || block.timestamp <= sub.graceEndTime) {
                    ++count;
                }
            }
        }

        // Collect
        ready = new uint256[](count);
        uint256 idx = 0;
        for (uint256 i = 1; i <= subCount; ++i) {
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
     * @param subIds subIds
     * @return results results
     */
    function getSubscriptionsBatch(uint256[] calldata subIds) external view returns (Subscription[] memory results) {
        results = new Subscription[](subIds.length);
        for (uint256 i = 0; i < subIds.length; ++i) {
            results[i] = subscriptions[subIds[i]];
        }
    }
}
