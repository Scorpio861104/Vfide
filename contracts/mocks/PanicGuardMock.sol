// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract PanicGuardMock {
    mapping(address => bool) private quarantined;
    bool private _globalRisk;
    
    function setQuarantined(address vault, bool q) external {
        quarantined[vault] = q;
    }
    
    function setGlobalRisk(bool r) external {
        _globalRisk = r;
    }
    
    function isQuarantined(address vault) external view returns (bool) {
        return quarantined[vault];
    }
    
    function globalRisk() external view returns (bool) {
        return _globalRisk;
    }
}
