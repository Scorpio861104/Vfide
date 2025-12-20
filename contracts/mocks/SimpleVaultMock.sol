// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "../SharedInterfaces.sol";

contract MockVault_Simple {
    function approve(address token, address spender, uint256 amount) external {
        IERC20(token).approve(spender, amount);
    }
}
