// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract PresaleMock {
    uint256 public presaleStartTime;
    
    function launch() external {
        presaleStartTime = block.timestamp;
    }
    
    function launchNow() external {
        presaleStartTime = block.timestamp;
    }
}
