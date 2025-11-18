// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

// Force recompilation

contract ProofLedgerMock {
    event LogSystemEvent(address indexed who, string action, address by);
    event LogEvent(address indexed who, string action, uint256 amount, string note);

    function logSystemEvent(address who, string calldata action, address by) external {
        emit LogSystemEvent(who, action, by);
    }

    function logEvent(address who, string calldata action, uint256 amount, string calldata note) external {
        emit LogEvent(who, action, amount, note);
    }
}