// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract SeerMock {
    mapping(address => uint16) public scores;
    uint16 public minScore = 0;
    uint16 public highTrustThreshold = 8000; // 80% on 0-10000 scale
    uint16 public lowTrustThreshold = 4000;  // 40% on 0-10000 scale

    function setScore(address who, uint16 score) external { scores[who] = score; }
    function getScore(address who) external view returns (uint16) { 
        if (scores[who] == 0) return 5000; // Default neutral (50% on 0-10000 scale)
        return scores[who]; 
    }
    function setMin(uint16 m) external { minScore = m; }
    function minForMerchant() external view returns (uint16) { return minScore; }
    function minForGovernance() external view returns (uint16) { return minScore; }
    
    function setThresholds(uint16 high, uint16 low) external {
        highTrustThreshold = high;
        lowTrustThreshold = low;
    }
}
