// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract PresaleMock {
    uint256 public saleStartTime;
    
    function launch() external {
        saleStartTime = block.timestamp;
    }
    
    function launchNow() external {
        saleStartTime = block.timestamp;
    }
    
    function setSaleStartTime(uint256 _time) external {
        saleStartTime = _time;
    }
}
