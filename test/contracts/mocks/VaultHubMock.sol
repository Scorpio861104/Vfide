// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract VaultHubMock {
    mapping(address => address) public vaults;
    mapping(address => bool) public isVaultMap;

    function setVault(address owner, address vault) external {
        vaults[owner] = vault;
        isVaultMap[vault] = true;
    }
    function vaultOf(address owner) external view returns (address) {
        return vaults[owner];
    }
    function ensureVault(address owner) external returns (address) {
        if (vaults[owner] == address(0)) {
            address v = address(uint160(uint256(keccak256(abi.encode(owner)))));
            vaults[owner] = v;
            isVaultMap[v] = true;
        }
        return vaults[owner];
    }
    function isVault(address vault) external view returns (bool) {
        return isVaultMap[vault];
    }
}
