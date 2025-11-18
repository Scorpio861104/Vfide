// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract GuardianLockMock {
    mapping(address => bool) public locked;
    
    function setLocked(address vault, bool _locked) external {
        locked[vault] = _locked;
    }
}
