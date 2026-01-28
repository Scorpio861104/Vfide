// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

// A tiny mock contract that reverts for any calldata — used to force staticcall failures
contract RevertingDecimals {
    fallback() external payable {
        revert("revert-decimals");
    }
}
