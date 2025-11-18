// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract SanctumMock {
    event Disburse(address token, address charity, uint256 amount, string reason);
    
    function disburse(address token, address charity, uint256 amount, string calldata reason) external {
        emit Disburse(token, charity, amount, reason);
    }
}
