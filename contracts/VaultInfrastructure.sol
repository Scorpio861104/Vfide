// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./VaultInfrastructureLite.sol";

/**
 * @title VaultInfrastructure
 * @notice Thin wrapper around VaultInfrastructureLite to stay under 24KB bytecode limits.
 * @dev The monolithic implementation was removed in favor of the lightweight clone-based hub.
 */
contract VaultInfrastructure is VaultInfrastructureLite {
    constructor(
        address _implementation,
        address _vfideToken,
        address _securityHub,
        address _ledger,
        address _dao
    ) VaultInfrastructureLite(_implementation, _vfideToken, _securityHub, _ledger, _dao) {}
}