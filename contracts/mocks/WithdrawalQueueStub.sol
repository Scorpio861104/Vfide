// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

// F-44 FIX: WithdrawalQueueStub moved from contracts/WithdrawalQueue.sol to this mocks folder
// to prevent deployers from accidentally importing the stub into production deploy scripts.
// CI should reject any import of contracts/mocks/** in DeployPhase*.sol files.

import "../WithdrawalQueue.sol";

/**
 * @title WithdrawalQueueStub
 * @notice Minimal concrete implementation for testing only — NOT for production.
 * @dev In production, implement a vault-integrated subclass of WithdrawalQueue
 *      that overrides _executeWithdrawal and _getUserBalance against the real vault.
 */
contract WithdrawalQueueStub is WithdrawalQueue {
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
