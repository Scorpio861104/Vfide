// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IVaultHub {
    function ensureVault(address owner_) external returns (address vault);
    function isVault(address a) external view returns (bool);
    function vaultOf(address owner_) external view returns (address);
}