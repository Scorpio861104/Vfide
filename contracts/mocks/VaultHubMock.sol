// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract VaultHubMock {
    mapping(address => address) public vaults;
    function setVault(address owner, address vault) external {
        vaults[owner] = vault;
    }
    function vaultOf(address owner) external view returns (address) {
        return vaults[owner];
    }
}
