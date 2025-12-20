// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// Minimal ERC20 mock that returns false from transfer/transferFrom instead of reverting.
contract ERC20ReturnFalse {
    string public name = "BadToken";
    string public symbol = "BAD";
    uint8 public decimals = 18;

    // Intentionally no balances: transfers will return false
    function transfer(address, uint256) external pure returns (bool) {
        return false;
    }
    function transferFrom(address, address, uint256) external pure returns (bool) {
        return false;
    }
    function balanceOf(address) external pure returns (uint256) { return 0; }
}
