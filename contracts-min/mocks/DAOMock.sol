// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract DAOMock {
    event AdminSet(address admin);
    
    function setAdmin(address _admin) external {
        emit AdminSet(_admin);
    }
}
