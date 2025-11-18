// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IERC20Like {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

// Test-only vesting vault with a simple token pull method for scenarios.
contract TestVestingVault {
    function withdraw(address token, address to, uint256 amount) external {
        require(IERC20Like(token).transfer(to, amount), "TRANSFER_FAIL");
    }
    function tokenBalance(address token) external view returns (uint256) {
        return IERC20Like(token).balanceOf(address(this));
    }
}
