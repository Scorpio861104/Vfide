// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract DAOMock {
    event AdminSet(address admin);
    function setAdmin(address admin) external { emit AdminSet(admin); }
}

contract TimelockMock {
    event AdminSet(address admin);
    function setAdmin(address admin) external { emit AdminSet(admin); }
}

contract SanctumMockSimple {
    function disburse(address, uint256) external {}
}

contract GuardianLockMock {
    function setLocked(bool) external {}
}

contract PanicGuardInterfaceMock {
    function isQuarantined(address) external view returns (bool) { return false; }
}

contract EmergencyBreakerMock {
    function halted() external view returns (bool) { return false; }
    function toggle(bool, string calldata) external {}
}
