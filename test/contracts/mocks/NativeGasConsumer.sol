// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract NativeGasConsumer {
    uint256 public receives;

    receive() external payable {
        // SSTORE in receive path ensures >10k gas is needed.
        receives += 1;
    }
}
