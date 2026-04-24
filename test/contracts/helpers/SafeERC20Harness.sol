// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "../../../contracts/SharedInterfaces.sol";

contract ForceApproveHarness {
    using SafeERC20 for IERC20;

    function forceApproveToken(address token, address spender, uint256 amount) external {
        IERC20(token).forceApprove(spender, amount);
    }
}
