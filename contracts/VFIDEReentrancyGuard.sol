// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @title VFIDEReentrancyGuard
/// @notice Reentrancy protection with single-function and cross-contract guards.
/// @author Vfide
abstract contract VFIDEReentrancyGuard {
    /// @notice _NOT_ENTERED
    uint256 private constant _NOT_ENTERED = 1;
    /// @notice _ENTERED
    uint256 private constant _ENTERED = 2;

    /// @notice _status
    uint256 private _status = _NOT_ENTERED;
    /// @notice _contractStatus
    mapping(address => uint256) private _contractStatus;

    /// @notice Prevents reentrant calls to a function.
    modifier nonReentrant() {
        require(_status != _ENTERED, "VFIDEReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    /// @notice Prevents cross-contract reentrant calls.
    /// @param _contract _contract
    modifier nonReentrantCrossContract(address _contract) {
        require(_contractStatus[_contract] != _ENTERED, "VFIDEReentrancyGuard: cross-contract reentrant call");
        _contractStatus[_contract] = _ENTERED;
        _;
        _contractStatus[_contract] = _NOT_ENTERED;
    }
}
