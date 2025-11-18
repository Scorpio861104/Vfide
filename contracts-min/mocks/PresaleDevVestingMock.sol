// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract PresaleDevVestingMock {
    uint256 public presaleStartTime;

    function launch() external {
        presaleStartTime = block.timestamp;
    }

    function launchPresale(uint256 startTime) external {
        presaleStartTime = startTime;
    }

    function launchNow() external {
        presaleStartTime = block.timestamp;
    }
}
