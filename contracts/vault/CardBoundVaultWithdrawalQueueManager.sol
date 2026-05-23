// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @notice CardBoundVaultWithdrawalQueueManager
/// @title CardBoundVaultWithdrawalQueueManager
/// @author Vfide
contract CardBoundVaultWithdrawalQueueManager {
    /// @notice WITHDRAWAL_DELAY
    uint256 public constant WITHDRAWAL_DELAY = 7 days;
    /// @notice MAX_QUEUED
    uint8 public constant MAX_QUEUED = 50;

    struct QueuedWithdrawal {
        address toVault;
        uint256 amount;
        uint64 requestTime;
        uint64 executeAfter;
        bool executed;
        bool cancelled;
        uint256 intentNonce;
        bytes32 toVaultCodeHashAtQueue;
    }

    /// @notice vault
    address public immutable vault;
    /// @notice activeQueuedWithdrawals
    uint8 public activeQueuedWithdrawals;
    /// @notice _withdrawalQueue
    QueuedWithdrawal[] private _withdrawalQueue;

    /// @notice WQM_OnlyVault
    error WQM_OnlyVault();
    /// @notice WQM_QueueFull
    error WQM_QueueFull();
    /// @notice WQM_InvalidIndex
    error WQM_InvalidIndex();
    /// @notice WQM_AlreadyProcessed
    error WQM_AlreadyProcessed();
    /// @notice WQM_NotReady
    error WQM_NotReady();
    /// @notice WQM_NotAuthorized
    error WQM_NotAuthorized();
    /// @notice WQM_ReceiverChanged
    error WQM_ReceiverChanged();

    /// @notice onlyVault
    modifier onlyVault() {
        if (msg.sender != vault) revert WQM_OnlyVault();
        _;
    }

    /// @notice constructor
    /// @param vault_ vault_
    constructor(address vault_) {
        require(vault_ != address(0), "CBV-WQM: zero vault");
        vault = vault_;
    }

    /// @notice queueLength
    /// @return _uint256 _uint256
    function queueLength() external view returns (uint256) {
        return _withdrawalQueue.length;
    }

    /// @notice getPendingQueuedWithdrawals
    /// @return indices indices
    /// @return amounts amounts
    /// @return executeAfters executeAfters
    function getPendingQueuedWithdrawals() external view returns (uint256[] memory indices, uint256[] memory amounts, uint64[] memory executeAfters) {
        uint256 pendingCount = 0;
        uint256 _wqLen = _withdrawalQueue.length;
        for (uint256 i = 0; i < _wqLen; ++i) {
            if (!_withdrawalQueue[i].executed && !_withdrawalQueue[i].cancelled) ++pendingCount;
        }

        indices = new uint256[](pendingCount);
        amounts = new uint256[](pendingCount);
        executeAfters = new uint64[](pendingCount);

        uint256 idx = 0;
        for (uint256 i = 0; i < _wqLen; ++i) {
            if (!_withdrawalQueue[i].executed && !_withdrawalQueue[i].cancelled) {
                indices[idx] = i;
                amounts[idx] = _withdrawalQueue[i].amount;
                executeAfters[idx] = _withdrawalQueue[i].executeAfter;
                ++idx;
            }
        }
    }

    /// @notice getPendingQueuedWithdrawalsPaged
    /// @param start start
    /// @param limit limit
    /// @return indices indices
    /// @return amounts amounts
    /// @return executeAfters executeAfters
    function getPendingQueuedWithdrawalsPaged(uint256 start, uint256 limit) external view returns (uint256[] memory indices, uint256[] memory amounts, uint64[] memory executeAfters) {
        uint256 len = _withdrawalQueue.length;
        if (start >= len || limit == 0) {
            return (new uint256[](0), new uint256[](0), new uint64[](0));
        }

        uint256 end = start + limit;
        if (end > len) end = len;

        uint256 pendingCount = 0;
        for (uint256 i = start; i < end; ++i) {
            if (!_withdrawalQueue[i].executed && !_withdrawalQueue[i].cancelled) ++pendingCount;
        }

        indices = new uint256[](pendingCount);
        amounts = new uint256[](pendingCount);
        executeAfters = new uint64[](pendingCount);

        uint256 idx = 0;
        for (uint256 i = start; i < end; ++i) {
            if (!_withdrawalQueue[i].executed && !_withdrawalQueue[i].cancelled) {
                indices[idx] = i;
                amounts[idx] = _withdrawalQueue[i].amount;
                executeAfters[idx] = _withdrawalQueue[i].executeAfter;
                ++idx;
            }
        }
    }

    /// @notice withdrawalQueue
    /// @param index index
    /// @return toVault toVault
    /// @return amount amount
    /// @return requestTime requestTime
    /// @return executeAfter executeAfter
    /// @return executed executed
    /// @return cancelled cancelled
    /// @return intentNonce intentNonce
    /// @return toVaultCodeHashAtQueue toVaultCodeHashAtQueue
    function withdrawalQueue(
        uint256 index
    ) external view returns (address toVault, uint256 amount, uint64 requestTime, uint64 executeAfter, bool executed, bool cancelled, uint256 intentNonce, bytes32 toVaultCodeHashAtQueue) {
        QueuedWithdrawal storage w = _withdrawalQueue[index];
        return (w.toVault, w.amount, w.requestTime, w.executeAfter, w.executed, w.cancelled, w.intentNonce, w.toVaultCodeHashAtQueue);
    }

    /// @notice queueWithdrawal
    /// @param toVault toVault
    /// @param amount amount
    /// @param intentNonce intentNonce
    /// @return queueIndex queueIndex
    /// @return executeAfter executeAfter
    function queueWithdrawal(address toVault, uint256 amount, uint256 intentNonce) external onlyVault returns (uint256 queueIndex, uint64 executeAfter) {
        if (activeQueuedWithdrawals >= MAX_QUEUED) revert WQM_QueueFull();

        executeAfter = uint64(block.timestamp) + uint64(WITHDRAWAL_DELAY);

        bytes32 codeHash;
        assembly {
            codeHash := extcodehash(toVault)
        }

        _withdrawalQueue.push(
            QueuedWithdrawal({
                toVault: toVault,
                amount: amount,
                requestTime: uint64(block.timestamp),
                executeAfter: executeAfter,
                executed: false,
                cancelled: false,
                intentNonce: intentNonce,
                toVaultCodeHashAtQueue: codeHash
            })
        );
        ++activeQueuedWithdrawals;
        queueIndex = _withdrawalQueue.length - 1;
    }

    /// @notice executeQueuedWithdrawal
    /// @param queueIndex queueIndex
    /// @param isAdmin isAdmin
    /// @return toVault toVault
    /// @return amount amount
    function executeQueuedWithdrawal(uint256 queueIndex, bool isAdmin) external onlyVault returns (address toVault, uint256 amount) {
        if (!isAdmin) revert WQM_NotAuthorized();
        if (queueIndex >= _withdrawalQueue.length) revert WQM_InvalidIndex();

        QueuedWithdrawal storage w = _withdrawalQueue[queueIndex];
        if (w.executed || w.cancelled) revert WQM_AlreadyProcessed();
        if (block.timestamp < w.executeAfter) revert WQM_NotReady();

        toVault = w.toVault;
        bytes32 currentCodeHash;
        assembly {
            currentCodeHash := extcodehash(toVault)
        }
        if (currentCodeHash != w.toVaultCodeHashAtQueue) revert WQM_ReceiverChanged();

        w.executed = true;
        if (activeQueuedWithdrawals > 0) {
            --activeQueuedWithdrawals;
        }

        amount = w.amount;
    }

    /// @notice cancelQueuedWithdrawal
    /// @param queueIndex queueIndex
    /// @param authorized authorized
    /// @return requestTime requestTime
    /// @return amount amount
    function cancelQueuedWithdrawal(uint256 queueIndex, bool authorized) external onlyVault returns (uint64 requestTime, uint256 amount) {
        if (!authorized) revert WQM_NotAuthorized();
        if (queueIndex >= _withdrawalQueue.length) revert WQM_InvalidIndex();

        QueuedWithdrawal storage w = _withdrawalQueue[queueIndex];
        if (w.executed || w.cancelled) revert WQM_AlreadyProcessed();

        w.cancelled = true;
        if (activeQueuedWithdrawals > 0) {
            --activeQueuedWithdrawals;
        }

        requestTime = w.requestTime;
        amount = w.amount;
    }

    /// @notice clearOnRecovery
    function clearOnRecovery() external onlyVault {
        delete _withdrawalQueue;
        activeQueuedWithdrawals = 0;
    }
}
