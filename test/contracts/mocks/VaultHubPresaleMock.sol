// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract VaultHubPresaleMock {
    mapping(address => address) public vaultOf;
    
    function ensureVault(address owner_) external returns (address vault) {
        if (vaultOf[owner_] == address(0)) {
            vaultOf[owner_] = address(uint160(uint256(keccak256(abi.encodePacked(owner_)))));
        }
        return vaultOf[owner_];
    }
}
