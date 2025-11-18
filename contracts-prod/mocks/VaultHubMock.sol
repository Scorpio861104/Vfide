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
    
    function ensureVault(address owner_) external returns (address vault) {
        if (vaults[owner_] == address(0)) {
            vaults[owner_] = address(uint160(uint256(keccak256(abi.encodePacked(owner_)))));
        }
        return vaults[owner_];
    }
}
