// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract CardBoundVaultWithdrawalQueueManager {
    uint256 public constant WITHDRAWAL_DELAY = 7 days;
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

    address public immutable vault;
    uint8 public activeQueuedWithdrawals;
    QueuedWithdrawal[] private _withdrawalQueue;

    error WQM_OnlyVault();
    error WQM_QueueFull();
    error WQM_InvalidIndex();
    error WQM_AlreadyProcessed();
    error WQM_NotReady();
    error WQM_NotAuthorized();
    error WQM_ReceiverChanged();

    modifier onlyVault() {
        if (msg.sender != vault) revert WQM_OnlyVault();
        _;
    }

    constructor(address vault_) {
        require(vault_ != address(0), "CBV-WQM: zero vault");
        vault = vault_;
    }

    function queueLength() external view returns (uint256) {
        return _withdrawalQueue.length;
    }

    function getPendingQueuedWithdrawals()
        external
        view
        returns (uint256[] memory indices, uint256[] memory amounts, uint64[] memory executeAfters)
    {
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

    function getPendingQueuedWithdrawalsPaged(uint256 start, uint256 limit)
        external
        view
        returns (uint256[] memory indices, uint256[] memory amounts, uint64[] memory executeAfters)
    {
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

    function withdrawalQueue(uint256 index)
        external
        view
        returns (
            address toVault,
            uint256 amount,
            uint64 requestTime,
            uint64 executeAfter,
            bool executed,
            bool cancelled,
            uint256 intentNonce,
            bytes32 toVaultCodeHashAtQueue
        )
    {
        QueuedWithdrawal storage w = _withdrawalQueue[index];
        return (
            w.toVault,
            w.amount,
            w.requestTime,
            w.executeAfter,
            w.executed,
            w.cancelled,
            w.intentNonce,
            w.toVaultCodeHashAtQueue
        );
    }

    function queueWithdrawal(address toVault, uint256 amount, uint256 intentNonce)
        external
        onlyVault
        returns (uint256 queueIndex, uint64 executeAfter)
    {
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

    function executeQueuedWithdrawal(uint256 queueIndex, bool isAdmin)
        external
        onlyVault
        returns (address toVault, uint256 amount)
    {
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

    function cancelQueuedWithdrawal(uint256 queueIndex, bool authorized)
        external
        onlyVault
        returns (uint64 requestTime, uint256 amount)
    {
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

    function clearOnRecovery() external onlyVault {
        delete _withdrawalQueue;
        activeQueuedWithdrawals = 0;
    }
}
