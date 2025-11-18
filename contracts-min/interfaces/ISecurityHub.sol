// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface ISecurityHub {
    function isLocked(address vault) external view returns (bool);
}