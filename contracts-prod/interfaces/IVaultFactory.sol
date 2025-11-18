// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IVaultFactory {
    function createVault(address owner) external returns (address);
    function predictVault(address owner) external view returns (address);
}