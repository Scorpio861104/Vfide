// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract CardBoundVaultPaymentQueueManager {
    uint256 public constant WITHDRAWAL_DELAY = 7 days;
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

    address public immutable vault;
    uint256 public largePaymentThreshold;
    uint8 public activeQueuedPayments;
    QueuedPayment[] private _paymentQueue;
    PendingLargePaymentThresholdChange public pendingLargePaymentThresholdChange;

    error PQM_OnlyVault();
    error PQM_QueueFull();
    error PQM_InvalidIndex();
    error PQM_AlreadyProcessed();
    error PQM_NotReady();
    error PQM_NotAuthorized();
    error PQM_NoPending();
    error PQM_DelayActive();
    error PQM_ReceiverChanged();

    modifier onlyVault() {
        if (msg.sender != vault) revert PQM_OnlyVault();
        _;
    }

    constructor(address vault_, uint256 initialThreshold) {
        vault = vault_;
        largePaymentThreshold = initialThreshold;
    }

    function queueLength() external view returns (uint256) {
        return _paymentQueue.length;
    }

    function paymentQueue(uint256 index)
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
        return (
            q.token,
            q.merchant,
            q.recipient,
            q.amount,
            q.requestTime,
            q.executeAfter,
            q.executed,
            q.cancelled,
            q.intentNonce,
            q.recipientCodeHashAtQueue
        );
    }

    function queuePayment(
        address token,
        address merchant,
        address recipient,
        uint256 amount,
        uint256 intentNonce
    ) external onlyVault returns (uint256 queueIndex, uint64 executeAfter) {
        if (activeQueuedPayments >= MAX_QUEUED_PAYMENTS) revert PQM_QueueFull();

        executeAfter = uint64(block.timestamp) + uint64(WITHDRAWAL_DELAY);

        bytes32 codeHash;
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
        activeQueuedPayments += 1;
        queueIndex = _paymentQueue.length - 1;
    }

    function executeQueuedPayment(uint256 queueIndex, bool isAdmin)
        external
        onlyVault
        returns (address token, address recipient, uint256 amount)
    {
        if (!isAdmin) revert PQM_NotAuthorized();
        if (queueIndex >= _paymentQueue.length) revert PQM_InvalidIndex();

        QueuedPayment storage q = _paymentQueue[queueIndex];
        if (q.executed || q.cancelled) revert PQM_AlreadyProcessed();
        if (block.timestamp < q.executeAfter) revert PQM_NotReady();

        recipient = q.recipient;
        bytes32 currentCodeHash;
        assembly {
            currentCodeHash := extcodehash(recipient)
        }
        if (currentCodeHash != q.recipientCodeHashAtQueue) revert PQM_ReceiverChanged();

        q.executed = true;
        if (activeQueuedPayments > 0) {
            activeQueuedPayments -= 1;
        }

        token = q.token;
        amount = q.amount;
    }

    function cancelQueuedPayment(uint256 queueIndex, bool authorized)
        external
        onlyVault
        returns (uint64 requestTime, uint256 amount)
    {
        if (!authorized) revert PQM_NotAuthorized();
        if (queueIndex >= _paymentQueue.length) revert PQM_InvalidIndex();

        QueuedPayment storage q = _paymentQueue[queueIndex];
        if (q.executed || q.cancelled) revert PQM_AlreadyProcessed();

        q.cancelled = true;
        if (activeQueuedPayments > 0) {
            activeQueuedPayments -= 1;
        }

        requestTime = q.requestTime;
        amount = q.amount;
    }

    function setLargePaymentThreshold(uint256 threshold, uint64 delay)
        external
        onlyVault
        returns (uint64 executeAfter)
    {
        executeAfter = uint64(block.timestamp) + delay;
        pendingLargePaymentThresholdChange = PendingLargePaymentThresholdChange({
            threshold: threshold,
            executeAfter: executeAfter
        });
    }

    function applyLargePaymentThreshold()
        external
        onlyVault
        returns (uint256 oldThreshold, uint256 newThreshold)
    {
        PendingLargePaymentThresholdChange memory pending = pendingLargePaymentThresholdChange;
        if (pending.executeAfter == 0) revert PQM_NoPending();
        if (block.timestamp < pending.executeAfter) revert PQM_DelayActive();

        oldThreshold = largePaymentThreshold;
        newThreshold = pending.threshold;
        largePaymentThreshold = newThreshold;
        delete pendingLargePaymentThresholdChange;
    }

    function clearOnRecovery() external onlyVault {
        delete _paymentQueue;
        activeQueuedPayments = 0;
        delete pendingLargePaymentThresholdChange;
    }

    /// @notice Cancel a pending large-payment threshold change before it executes.
    /// Backlog fix (R77): Completes the apply+cancel symmetry for all 8 timelocked
    /// pipelines. Previously only applyLargePaymentThreshold existed with no cancel.
    function cancelLargePaymentThreshold()
        external
        onlyVault
        returns (uint256 threshold, uint64 executeAfter)
    {
        PendingLargePaymentThresholdChange memory pending = pendingLargePaymentThresholdChange;
        if (pending.executeAfter == 0) revert PQM_NoPending();
        threshold = pending.threshold;
        executeAfter = pending.executeAfter;
        delete pendingLargePaymentThresholdChange;
    }
}
