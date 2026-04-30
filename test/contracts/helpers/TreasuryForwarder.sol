// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @dev Minimal treasury helper for tests: forwards VFIDE from treasury custody.
contract TreasuryForwarder {
    function sweep(address token, address to, uint256 amount) external {
        IERC20(token).transfer(to, amount);
    }
}
