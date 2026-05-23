// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @notice MockToken
/// @title MockToken
/// @author Vfide
contract MockToken {
    /// @notice name
    string public constant name = "Mock VFIDE";
    /// @notice symbol
    string public constant symbol = "mVFIDE";
    /// @notice decimals
    uint8 public constant decimals = 18;

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
        require(balanceOf[msg.sender] >= amount, "insufficient");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

/// @notice MockVaultHub
/// @title MockVaultHub
/// @author Vfide
contract MockVaultHub {
    /// @notice vault
    address public vault;

    /// @notice constructor
    /// @param _vault _vault
    constructor(address _vault) {
        vault = _vault;
    }

    /// @notice ensureVault
    /// @return _address _address
    function ensureVault(address) external view returns (address) {
        return vault;
    }
}

/// @notice MockSecurityHub
/// @title MockSecurityHub
/// @author Vfide
contract MockSecurityHub {
    /// @notice locked
    bool public locked;

    /// @notice setLocked
    /// @param value value
    function setLocked(bool value) external {
        locked = value;
    }

    /// @notice isLocked
    /// @return _bool _bool
    function isLocked(address) external view returns (bool) {
        return locked;
    }
}
