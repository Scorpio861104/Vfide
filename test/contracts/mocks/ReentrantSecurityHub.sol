// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IVaultHubEnsure {
    function ensureVault(address owner_) external returns (address vault);
}

contract ReentrantSecurityHub {
    address public hub;
    address public targetOwner;
    bool public attempted;
    bool public reentrySucceeded;

    function configure(address _hub, address _targetOwner) external {
        hub = _hub;
        targetOwner = _targetOwner;
    }

    function isLocked(address) external pure returns (bool) {
        return false;
    }

    function registerVault(address) external {
        if (attempted || hub == address(0) || targetOwner == address(0)) {
            return;
        }

        attempted = true;
        try IVaultHubEnsure(hub).ensureVault(targetOwner) {
            reentrySucceeded = true;
        } catch {
            reentrySucceeded = false;
        }
    }
}
