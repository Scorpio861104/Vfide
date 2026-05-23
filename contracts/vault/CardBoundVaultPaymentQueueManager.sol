// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @notice CardBoundVaultPaymentQueueManager
/// @title CardBoundVaultPaymentQueueManager
/// @author Vfide
contract CardBoundVaultPaymentQueueManager {
    /// @notice WITHDRAWAL_DELAY
    uint256 public constant WITHDRAWAL_DELAY = 7 days;
    /// @notice MAX_QUEUED_PAYMENTS
    uint8 public constant MAX_QUEUED_PAYMENTS = 50;

    struct QueuedPayment {
        address token;
        address merchant;
        address recipient;
        uint256 amount;
        uint64 requestTime;
        uint64 executeAfter;
        bool executed;
        bool cancelled;
        uint256 intentNonce;
        bytes32 recipientCodeHashAtQueue;
    }

    struct PendingLargePaymentThresholdChange {
        uint256 threshold;
        uint64 executeAfter;
    }

    /// @notice vault
    address public immutable vault;
    /// @notice largePaymentThreshold
    uint256 public largePaymentThreshold;
    /// @notice activeQueuedPayments
    uint8 public activeQueuedPayments;
    /// @notice _paymentQueue
    QueuedPayment[] private _paymentQueue;
    /// @notice pendingLargePaymentThresholdChange
    PendingLargePaymentThresholdChange public pendingLargePaymentThresholdChange;

    /// @notice PQM_OnlyVault
    error PQM_OnlyVault();
    /// @notice PQM_QueueFull
    error PQM_QueueFull();
    /// @notice PQM_InvalidIndex
    error PQM_InvalidIndex();
    /// @notice PQM_AlreadyProcessed
    error PQM_AlreadyProcessed();
    /// @notice PQM_NotReady
    error PQM_NotReady();
    /// @notice PQM_NotAuthorized
    error PQM_NotAuthorized();
    /// @notice PQM_NoPending
    error PQM_NoPending();
    /// @notice PQM_DelayActive
    error PQM_DelayActive();
    /// @notice PQM_ReceiverChanged
    error PQM_ReceiverChanged();

    /// @notice onlyVault
    modifier onlyVault() {
        if (msg.sender != vault) revert PQM_OnlyVault();
        _;
    }

    /// @notice constructor
    /// @param vault_ vault_
    /// @param initialThreshold initialThreshold
    constructor(address vault_, uint256 initialThreshold) {
        require(vault_ != address(0), "CBV-PQM: zero vault");
        vault = vault_;
        largePaymentThreshold = initialThreshold;
    }

    /// @notice queueLength
    /// @return _uint256 _uint256
    function queueLength() external view returns (uint256) {
        return _paymentQueue.length;
    }

    /// @notice paymentQueue
    /// @param index index
    /// @return token token
    /// @return merchant merchant
    /// @return recipient recipient
    /// @return amount amount
    /// @return requestTime requestTime
    /// @return executeAfter executeAfter
    /// @return executed executed
    /// @return cancelled cancelled
    /// @return intentNonce intentNonce
    /// @return recipientCodeHashAtQueue recipientCodeHashAtQueue
    function paymentQueue(
        uint256 index
    )
        external
        view
        returns (
            address token,
            address merchant,
            address recipient,
            uint256 amount,
            uint64 requestTime,
            uint64 executeAfter,
            bool executed,
            bool cancelled,
            uint256 intentNonce,
            bytes32 recipientCodeHashAtQueue
        )
    {
        QueuedPayment storage q = _paymentQueue[index];
        return (q.token, q.merchant, q.recipient, q.amount, q.requestTime, q.executeAfter, q.executed, q.cancelled, q.intentNonce, q.recipientCodeHashAtQueue);
    }

    /// @notice queuePayment
    /// @param token token
    /// @param merchant merchant
    /// @param recipient recipient
    /// @param amount amount
    /// @param intentNonce intentNonce
    /// @return queueIndex queueIndex
    /// @return executeAfter executeAfter
    function queuePayment(address token, address merchant, address recipient, uint256 amount, uint256 intentNonce) external onlyVault returns (uint256 queueIndex, uint64 executeAfter) {
        if (activeQueuedPayments >= MAX_QUEUED_PAYMENTS) revert PQM_QueueFull();

        executeAfter = uint64(block.timestamp) + uint64(WITHDRAWAL_DELAY);

        bytes32 codeHash;
        // audit-ok(assembly): Reviewed: idiomatic low-level pattern (extcodesize/extcodehash/create2 or vendored audited code) — must not be modified
        assembly {
            codeHash := extcodehash(recipient)
        }

        _paymentQueue.push(
            QueuedPayment({
                token: token,
                merchant: merchant,
                recipient: recipient,
                amount: amount,
                requestTime: uint64(block.timestamp),
                executeAfter: executeAfter,
                executed: false,
                cancelled: false,
                intentNonce: intentNonce,
                recipientCodeHashAtQueue: codeHash
            })
        );
        ++activeQueuedPayments;
        queueIndex = _paymentQueue.length - 1;
    }

    /// @notice executeQueuedPayment
    /// @param queueIndex queueIndex
    /// @param isAdmin isAdmin
    /// @return token token
    /// @return recipient recipient
    /// @return amount amount
    function executeQueuedPayment(uint256 queueIndex, bool isAdmin) external onlyVault returns (address token, address recipient, uint256 amount) {
        if (!isAdmin) revert PQM_NotAuthorized();
        if (queueIndex >= _paymentQueue.length) revert PQM_InvalidIndex();

        QueuedPayment storage q = _paymentQueue[queueIndex];
        if (q.executed || q.cancelled) revert PQM_AlreadyProcessed();
        if (block.timestamp < q.executeAfter) revert PQM_NotReady();

        recipient = q.recipient;
        bytes32 currentCodeHash;
        // audit-ok(assembly): Reviewed: idiomatic low-level pattern (extcodesize/extcodehash/create2 or vendored audited code) — must not be modified
        assembly {
            currentCodeHash := extcodehash(recipient)
        }
        if (currentCodeHash != q.recipientCodeHashAtQueue) revert PQM_ReceiverChanged();

        q.executed = true;
        if (activeQueuedPayments > 0) {
            --activeQueuedPayments;
        }

        token = q.token;
        amount = q.amount;
    }

    /// @notice cancelQueuedPayment
    /// @param queueIndex queueIndex
    /// @param authorized authorized
    /// @return requestTime requestTime
    /// @return amount amount
    function cancelQueuedPayment(uint256 queueIndex, bool authorized) external onlyVault returns (uint64 requestTime, uint256 amount) {
        if (!authorized) revert PQM_NotAuthorized();
        if (queueIndex >= _paymentQueue.length) revert PQM_InvalidIndex();

        QueuedPayment storage q = _paymentQueue[queueIndex];
        if (q.executed || q.cancelled) revert PQM_AlreadyProcessed();

        q.cancelled = true;
        if (activeQueuedPayments > 0) {
            --activeQueuedPayments;
        }

        requestTime = q.requestTime;
        amount = q.amount;
    }

    /// @notice setLargePaymentThreshold
    /// @param threshold threshold
    /// @param delay delay
    /// @return executeAfter executeAfter
    function setLargePaymentThreshold(uint256 threshold, uint64 delay) external onlyVault returns (uint64 executeAfter) {
        executeAfter = uint64(block.timestamp) + delay;
        pendingLargePaymentThresholdChange = PendingLargePaymentThresholdChange({threshold: threshold, executeAfter: executeAfter});
    }

    /// @notice applyLargePaymentThreshold
    /// @return oldThreshold oldThreshold
    /// @return newThreshold newThreshold
    function applyLargePaymentThreshold() external onlyVault returns (uint256 oldThreshold, uint256 newThreshold) {
        PendingLargePaymentThresholdChange memory pending = pendingLargePaymentThresholdChange;
        if (pending.executeAfter == 0) revert PQM_NoPending();
        if (block.timestamp < pending.executeAfter) revert PQM_DelayActive();

        oldThreshold = largePaymentThreshold;
        newThreshold = pending.threshold;
        largePaymentThreshold = newThreshold;
        delete pendingLargePaymentThresholdChange;
    }

    /// @notice clearOnRecovery
    function clearOnRecovery() external onlyVault {
        delete _paymentQueue;
        activeQueuedPayments = 0;
        delete pendingLargePaymentThresholdChange;
    }

    /// @notice Cancel a pending large-payment threshold change before it executes.
    /// Backlog fix (R77): Completes the apply+cancel symmetry for all 8 timelocked
    /// pipelines. Previously only applyLargePaymentThreshold existed with no cancel.
    /// @return threshold threshold
    /// @return executeAfter executeAfter
    function cancelLargePaymentThreshold() external onlyVault returns (uint256 threshold, uint64 executeAfter) {
        PendingLargePaymentThresholdChange memory pending = pendingLargePaymentThresholdChange;
        if (pending.executeAfter == 0) revert PQM_NoPending();
        threshold = pending.threshold;
        executeAfter = pending.executeAfter;
        delete pendingLargePaymentThresholdChange;
    }
}
