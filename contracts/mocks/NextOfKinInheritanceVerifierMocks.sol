// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @notice MockVFIDEForInheritance
/// @title MockVFIDEForInheritance
/// @author Vfide
contract MockVFIDEForInheritance {
    /// @notice balanceOf
    mapping(address => uint256) public balanceOf;

    /// @notice mint
    /// @param to to
    /// @param amount amount
    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    /// @notice transfer
    /// @param to to
    /// @param amount amount
    /// @return _bool _bool
    function transfer(address to, uint256 amount) external returns (bool) {
        uint256 fromBal = balanceOf[msg.sender];
        require(fromBal >= amount, "MOCK:insufficient");
        unchecked {
            balanceOf[msg.sender] = fromBal - amount;
        }
        balanceOf[to] += amount;
        return true;
    }

    /// @notice approve
    /// @param _address _address
    /// @param _uint256 _uint256
    /// @return _bool _bool
    function approve(address, uint256) external pure returns (bool) {
        return true;
    }
}

/// @notice MockVaultHubForInheritance
/// @title MockVaultHubForInheritance
/// @author Vfide
contract MockVaultHubForInheritance {
    /// @notice vaultOf
    mapping(address => address) public vaultOf;

    /// @notice setVault
    /// @param user user
    /// @param vault vault
    function setVault(address user, address vault) external {
        vaultOf[user] = vault;
    }
}
