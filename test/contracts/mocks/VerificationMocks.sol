// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "../../../contracts/SharedInterfaces.sol";

contract MockVaultHub is IVaultHub {
    mapping(address => address) public vaults;
    uint256 public totalVaultsCreatedCount;
    
    function setVault(address owner, address vault) external {
        vaults[owner] = vault;
    }
    
    function vaultOf(address owner) external view override returns (address) {
        return vaults[owner];
    }
    
    function isVault(address a) external view override returns (bool) {
        // Returns true if a == vaults[a], it's a vault (since we set vault=owner in test)
        return vaults[a] == a;
    }

    function ensureVault(address owner_) external override returns (address vault) {
        vault = vaults[owner_];
        if (vault == address(0)) {
            // Create dummy vault
            vault = address(uint160(uint256(keccak256(abi.encodePacked(owner_, block.timestamp)))));
            vaults[owner_] = vault;
            totalVaultsCreatedCount++;
        }
    }
    
    function setVFIDEToken(address) external override {}
    function setSecurityHub(address) external {}
    function setProofLedger(address) external override {}
    function setDAORecoveryMultisig(address) external override {}
    function setRecoveryTimelock(uint256) external override {}
    function requestDAORecovery(address, address) external override {}
    function finalizeDAORecovery(address) external override {}
    function cancelDAORecovery(address) external override {}
    function totalVaultsCreated() external view override returns (uint256) {
        return totalVaultsCreatedCount;
    }
}