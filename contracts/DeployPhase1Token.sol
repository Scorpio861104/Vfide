// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./VFIDEToken.sol";

/// @notice LEGACY — Do not use. Exists for historical contract verification only.
/// @dev This factory cannot safely provide canonical constructor dependencies (e.g., real
///      DevReserveVestingVault address). Always use contracts/scripts/deploy-phase1.ts instead,
///      which handles all dependencies through TypeScript configuration.
contract Phase1TokenDeployer {
    function deployToken(
        string memory,
        string memory,
        uint256,
        address,
        address
    ) external pure returns (address) {
        revert("Phase1TokenDeployer: LEGACY factory disabled. Use contracts/scripts/deploy-phase1.ts for production.");
    }
}
