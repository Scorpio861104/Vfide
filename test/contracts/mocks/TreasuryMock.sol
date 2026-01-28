// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract TreasuryMock {
    event NoteVFIDE(uint256 amount, address from);
    
    function noteVFIDE(uint256 amount, address from) external {
        emit NoteVFIDE(amount, from);
    }
}
