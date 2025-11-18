// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract EmergencyBreakerMock {
    bool private _halted;
    
    function setHalted(bool h) external {
        _halted = h;
    }
    
    function toggle(bool halt, string calldata) external {
        _halted = halt;
    }
    
    function halted() external view returns (bool) {
        return _halted;
    }
    
    function isHalted() external view returns (bool) {
        return _halted;
    }
}
