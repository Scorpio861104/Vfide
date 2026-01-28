// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "../SharedInterfaces.sol";

contract MockSwapRouter {
    address public stablecoin;

    constructor(address _stable) {
        stablecoin = _stable;
    }

    // Mock swap: Takes TokenIn, gives TokenOut (1:1 for simplicity in mock)
    // In reality this would use a pool
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts) {
        // Burn input (mocking the swap)
        IERC20(path[0]).transferFrom(msg.sender, address(this), amountIn);
        
        // Mint/Send output
        // We assume this contract is funded with stablecoin for the mock
        IERC20(path[path.length - 1]).transfer(to, amountIn); // 1:1 rate
        
        amounts = new uint256[](2);
        amounts[0] = amountIn;
        amounts[1] = amountIn;
        return amounts;
    }
}
