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
    function isQuarantined(address) external pure returns (bool) { return false; }
}

contract EmergencyBreakerMock {
    function halted() external pure returns (bool) { return false; }
    function toggle(bool, string calldata) external {}
}

contract EmergencyBreakerStatefulMock {
    bool private _halted;

    function halted() external view returns (bool) {
        return _halted;
    }

    function toggle(bool halt, string calldata) external {
        _halted = halt;
    }
}

contract RevertingSeerRewardMock {
    function reward(address, uint16, string calldata) external pure {
        revert("seer reward failed");
    }
}

contract RecoveryOwnableTargetMock {
    address public owner;
    address public emergencyController;

    constructor(address initialOwner) {
        owner = initialOwner;
    }

    function setEmergencyController(address controller) external {
        emergencyController = controller;
    }

    function emergencyTransferOwnership(address newOwner) external {
        require(msg.sender == emergencyController, "OWN: not emergency controller");
        require(newOwner != address(0), "OWN: zero");
        owner = newOwner;
    }
}
