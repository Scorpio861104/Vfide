// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "../../../contracts/SharedInterfaces.sol";

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
    bool public haltedState;

    function setHalted(bool value) external {
        haltedState = value;
    }

    function halted() external view returns (bool) { return haltedState; }

    function toggle(bool on, string calldata) external {
        haltedState = on;
    }
}

contract OwnableRecoveryTarget is Ownable {
    function touch() external pure returns (uint256) {
        return 1;
    }
}
