// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * @title VFIDEReentrancyGuard
 * @notice Gas-optimized reentrancy protection with cross-contract lock support.
 * @dev I-04/I-16 Note: This is DISTINCT from SharedInterfaces.ReentrancyGuard (single-contract guard)
 *      and from OZ ReentrancyGuard (used by VFIDEBridge, VaultRecoveryClaim, VaultRegistry).
 *      Use this guard (via WithdrawalQueue / CircuitBreaker) when cross-contract callbacks are expected.
 *      Use SharedInterfaces.ReentrancyGuard for single-contract protection.
 */
abstract contract VFIDEReentrancyGuard {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    uint256 private _status;

    mapping(address => uint256) private _contractStatus;

    event ReentrancyAttemptBlocked(address indexed caller, address indexed target);

    constructor() {
        _status = _NOT_ENTERED;
    }

    /**
     * @notice Prevents a contract from calling itself, directly or indirectly
     * @dev Modifier to make a function reentrancy-safe
     */
    modifier nonReentrant() {
        require(_status != _ENTERED, "VFIDEReentrancyGuard: reentrant call");

        _status = _ENTERED;

        _;

        _status = _NOT_ENTERED;
    }

    /**
     * @notice Prevents cross-contract reentrancy
     * @dev Use this when calling external contracts that might callback
     * @param _contract Address of the contract being called
     */
    modifier nonReentrantCrossContract(address _contract) {
        require(
            _contractStatus[_contract] != _ENTERED,
            "VFIDEReentrancyGuard: cross-contract reentrant call"
        );

        _contractStatus[_contract] = _ENTERED;

        _;

        _contractStatus[_contract] = _NOT_ENTERED;
    }

}

// L-19 Fix: Example contracts (VaultWithReentrancyProtection, TokenWithReentrancyProtection)
// moved to contracts/test/ to prevent deployment in production.
