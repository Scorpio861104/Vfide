// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract SeerAutonomousSessionMock {
    uint8 public result;

    function setResult(uint8 next) external {
        result = next;
    }

    function beforeAction(address, uint8, uint256, address) external view returns (uint8) {
        return result;
    }
}
