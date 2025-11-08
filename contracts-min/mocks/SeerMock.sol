// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract SeerMock {
    mapping(address => uint16) public scores;
    uint16 public minScore = 0;
    function setScore(address who, uint16 score) external { scores[who] = score; }
    function getScore(address who) external view returns (uint16) { return scores[who]; }
    function setMin(uint16 m) external { minScore = m; }
    function minForMerchant() external view returns (uint16) { return minScore; }
}
