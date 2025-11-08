// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IProofLedger {
    function logSystemEvent(address who, string calldata action, address by) external;
    function logEvent(address who, string calldata action, uint256 amount, string calldata note) external;
}