// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract PanicGuardRevertingMock {
    function globalRisk() external pure returns (bool) {
        revert("panic guard unavailable");
    }
}
