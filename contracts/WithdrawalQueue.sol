// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./VFIDEAccessControl.sol";
import "./VFIDEReentrancyGuard.sol";

/**
 * @title WithdrawalQueue
 * @notice Queue-based withdrawal system with delays and daily caps
 * @dev Implements 7-day delay for large withdrawals with governance override
 */
abstract contract WithdrawalQueue is VFIDEAccessControl, VFIDEReentrancyGuard {
    uint256 public constant WITHDRAWAL_DELAY = 7 days;
    uint256 public constant DAILY_WITHDRAWAL_CAP_PERCENT = 10; // 10% of vault

    struct WithdrawalRequest {
        address user;
        uint256 amount;
        uint256 requestTime;
        uint256 executionTime;
        bool executed;
        bool cancelled;
        string reason;
    }

    WithdrawalRequest[] public withdrawalQueue;
    
    mapping(address => uint256[]) public userWithdrawals;
    mapping(uint256 => uint256) public dailyWithdrawn;
    
    uint256 public totalVaultBalance;
    uint256 public minimumDelayAmount;

    event WithdrawalRequested(
        address indexed user,
        uint256 indexed queueIndex,
        uint256 amount,
        uint256 executionTime
    );
    
    event WithdrawalExecuted(
        address indexed user,
        uint256 indexed queueIndex,
        uint256 amount
    );
    
    event WithdrawalCancelled(
        uint256 indexed queueIndex,
        address indexed user,
        string reason
    );
    
    event DailyCapUpdated(uint256 newCap);
    event MinimumDelayAmountUpdated(uint256 newAmount);

    /**
     * @notice Constructor
     * @param _admin Admin address
     * @param _minimumDelayAmount Minimum amount that requires delay
     */
    constructor(address _admin, uint256 _minimumDelayAmount) VFIDEAccessControl(_admin) {
        minimumDelayAmount = _minimumDelayAmount;
    }

    /**
     * @notice Request a withdrawal
     * @param _amount Amount to withdraw
     * @param _reason Optional reason for withdrawal
     * @return queueIndex Index in the withdrawal queue
     */
    function requestWithdrawal(uint256 _amount, string calldata _reason) 
        external 
        nonReentrant 
        returns (uint256 queueIndex) 
    {
        require(_amount > 0, "WithdrawalQueue: zero amount");
        require(_amount <= _getUserBalance(msg.sender), "WithdrawalQueue: insufficient balance");

        uint256 executionTime = block.timestamp;
        
        // Apply delay for large withdrawals
        if (_amount >= minimumDelayAmount) {
            executionTime += WITHDRAWAL_DELAY;
        }

        queueIndex = withdrawalQueue.length;
        
        withdrawalQueue.push(WithdrawalRequest({
            user: msg.sender,
            amount: _amount,
            requestTime: block.timestamp,
            executionTime: executionTime,
            executed: false,
            cancelled: false,
            reason: _reason
        }));

        userWithdrawals[msg.sender].push(queueIndex);

        emit WithdrawalRequested(msg.sender, queueIndex, _amount, executionTime);
    }

    /**
     * @notice Execute a withdrawal request
     * @param _queueIndex Index in the withdrawal queue
     */
    function executeWithdrawal(uint256 _queueIndex) external nonReentrant {
        require(_queueIndex < withdrawalQueue.length, "WithdrawalQueue: invalid index");
        
        WithdrawalRequest storage request = withdrawalQueue[_queueIndex];
        
        require(!request.executed, "WithdrawalQueue: already executed");
        require(!request.cancelled, "WithdrawalQueue: cancelled");
        require(msg.sender == request.user, "WithdrawalQueue: not requester");
        require(block.timestamp >= request.executionTime, "WithdrawalQueue: too early");

        // Check daily cap
        uint256 today = block.timestamp / 1 days;
        uint256 dailyCap = (totalVaultBalance * DAILY_WITHDRAWAL_CAP_PERCENT) / 100;
        
        require(
            dailyWithdrawn[today] + request.amount <= dailyCap,
            "WithdrawalQueue: daily cap exceeded"
        );

        request.executed = true;
        dailyWithdrawn[today] += request.amount;

        _executeWithdrawal(request.user, request.amount);

        emit WithdrawalExecuted(request.user, _queueIndex, request.amount);
    }

    /**
     * @notice Batch execute multiple withdrawals
     * @param _indices Array of queue indices to execute
     */
    function batchExecuteWithdrawals(uint256[] calldata _indices) external nonReentrant {
        uint256 today = block.timestamp / 1 days;
        uint256 dailyCap = (totalVaultBalance * DAILY_WITHDRAWAL_CAP_PERCENT) / 100;
        uint256 totalAmount = 0;

        for (uint256 i = 0; i < _indices.length; i++) {
            require(_indices[i] < withdrawalQueue.length, "WithdrawalQueue: invalid index");
            
            WithdrawalRequest storage request = withdrawalQueue[_indices[i]];
            
            require(!request.executed, "WithdrawalQueue: already executed");
            require(!request.cancelled, "WithdrawalQueue: cancelled");
            require(msg.sender == request.user, "WithdrawalQueue: not requester");
            require(block.timestamp >= request.executionTime, "WithdrawalQueue: too early");

            totalAmount += request.amount;
        }

        require(
            dailyWithdrawn[today] + totalAmount <= dailyCap,
            "WithdrawalQueue: daily cap exceeded"
        );

        for (uint256 i = 0; i < _indices.length; i++) {
            WithdrawalRequest storage request = withdrawalQueue[_indices[i]];
            request.executed = true;
            _executeWithdrawal(request.user, request.amount);
            emit WithdrawalExecuted(request.user, _indices[i], request.amount);
        }

        dailyWithdrawn[today] += totalAmount;
    }

    /**
     * @notice Cancel a withdrawal request (governance only)
     * @param _queueIndex Index in the withdrawal queue
     * @param _reason Reason for cancellation
     */
    function cancelWithdrawal(uint256 _queueIndex, string calldata _reason) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(_queueIndex < withdrawalQueue.length, "WithdrawalQueue: invalid index");
        require(bytes(_reason).length > 0, "WithdrawalQueue: reason required");
        
        WithdrawalRequest storage request = withdrawalQueue[_queueIndex];
        
        require(!request.executed, "WithdrawalQueue: already executed");
        require(!request.cancelled, "WithdrawalQueue: already cancelled");

        request.cancelled = true;

        emit WithdrawalCancelled(_queueIndex, request.user, _reason);
    }

    /**
     * @notice Update total vault balance
     * @param _balance New vault balance
     */
    function updateVaultBalance(uint256 _balance) external onlyRole(CONFIG_MANAGER_ROLE) {
        totalVaultBalance = _balance;
    }

    /**
     * @notice Update minimum delay amount
     * @param _amount New minimum amount that requires delay
     */
    function updateMinimumDelayAmount(uint256 _amount) external onlyRole(CONFIG_MANAGER_ROLE) {
        minimumDelayAmount = _amount;
        emit MinimumDelayAmountUpdated(_amount);
    }

    /**
     * @notice Get user's withdrawal requests
     * @param _user User address
     * @return indices Array of queue indices for user
     */
    function getUserWithdrawals(address _user) external view returns (uint256[] memory) {
        return userWithdrawals[_user];
    }

    /**
     * @notice Get withdrawal request details
     * @param _queueIndex Queue index
        * @return user Requesting user
        * @return amount Requested amount
        * @return requestTime Request timestamp
        * @return executionTime Scheduled execution time
        * @return executed Whether request executed
        * @return cancelled Whether request cancelled
        * @return reason Cancellation reason
     */
    function getWithdrawalRequest(uint256 _queueIndex) 
        external 
        view 
        returns (
            address user,
            uint256 amount,
            uint256 requestTime,
            uint256 executionTime,
            bool executed,
            bool cancelled,
            string memory reason
        ) 
    {
        require(_queueIndex < withdrawalQueue.length, "WithdrawalQueue: invalid index");
        
        WithdrawalRequest storage request = withdrawalQueue[_queueIndex];
        
        return (
            request.user,
            request.amount,
            request.requestTime,
            request.executionTime,
            request.executed,
            request.cancelled,
            request.reason
        );
    }

    /**
     * @notice Get pending withdrawals for a user
     * @param _user User address
     * @return pending Array of pending withdrawal indices
     */
    function getPendingWithdrawals(address _user) 
        external 
        view 
        returns (uint256[] memory pending) 
    {
        uint256[] memory userIndices = userWithdrawals[_user];
        uint256 pendingCount = 0;

        // Count pending withdrawals
        for (uint256 i = 0; i < userIndices.length; i++) {
            WithdrawalRequest storage request = withdrawalQueue[userIndices[i]];
            if (!request.executed && !request.cancelled) {
                pendingCount++;
            }
        }

        // Populate array
        pending = new uint256[](pendingCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < userIndices.length; i++) {
            WithdrawalRequest storage request = withdrawalQueue[userIndices[i]];
            if (!request.executed && !request.cancelled) {
                pending[index++] = userIndices[i];
            }
        }
    }

    /**
     * @notice Get today's remaining withdrawal capacity
     * @return remaining Remaining amount that can be withdrawn today
     */
    function getRemainingDailyCapacity() external view returns (uint256 remaining) {
        uint256 today = block.timestamp / 1 days;
        uint256 dailyCap = (totalVaultBalance * DAILY_WITHDRAWAL_CAP_PERCENT) / 100;
        uint256 withdrawn = dailyWithdrawn[today];
        
        if (withdrawn >= dailyCap) {
            return 0;
        }
        
        return dailyCap - withdrawn;
    }

    /**
     * @notice Internal function to execute withdrawal (to be overridden)
     * @param _user User address
     * @param _amount Amount to withdraw
     * @dev MUST be overridden in implementing contract with actual withdrawal logic
     */
    function _executeWithdrawal(address _user, uint256 _amount) internal virtual;

    /**
     * @notice Internal function to get user balance (to be overridden)
     * @param _user User address
     * @return balance User's balance
     * @dev MUST be overridden in implementing contract with actual balance logic
     */
    function _getUserBalance(address _user) internal view virtual returns (uint256);

    /**
     * @notice Get queue length
     * @return length Total number of withdrawal requests
     */
    function queueLength() external view returns (uint256) {
        return withdrawalQueue.length;
    }
}

/**
 * @title WithdrawalQueueStub
 * @notice Minimal concrete implementation for deployment/testing
 * @dev Replace with a vault-integrated implementation in production
 */
abstract contract WithdrawalQueueStub is WithdrawalQueue {
    mapping(address => uint256) private balances;

    constructor(address _admin, uint256 _minimumDelayAmount)
        WithdrawalQueue(_admin, _minimumDelayAmount)
    {}

    function setUserBalance(address user, uint256 balance)
        external
        onlyRole(CONFIG_MANAGER_ROLE)
    {
        balances[user] = balance;
    }

    function _executeWithdrawal(address user, uint256 amount) internal override {
        require(balances[user] >= amount, "WithdrawalQueue: insufficient balance");
        balances[user] -= amount;
    }

    function _getUserBalance(address user) internal view override returns (uint256) {
        return balances[user];
    }
}
