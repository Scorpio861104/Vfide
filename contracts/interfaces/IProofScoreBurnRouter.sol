// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IProofScoreBurnRouter {
    function route(address user, uint256 amount) external returns (uint256);
    function adjustScore(address user, uint16 delta, bool increase) external;
}