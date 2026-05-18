// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract LedgerMock {
    bool public willRevert;

    event LoggedSystem(address who, string action, address by);
    event Logged(address who, string action, uint256 amount, string note);

    constructor(bool _revert) {
        willRevert = _revert;
    }

    function setRevert(bool v) external { willRevert = v; }

    function logSystemEvent(address who, string calldata action, address by) external {
        if (willRevert) revert("ledger revert");
        emit LoggedSystem(who, action, by);
    }

    function logEvent(address who, string calldata action, uint256 amount, string calldata note) external {
        if (willRevert) revert("ledger revert");
        emit Logged(who, action, amount, note);
    }
}
