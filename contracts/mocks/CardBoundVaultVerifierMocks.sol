// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @notice MockVaultRegistryForCardBound
/// @title MockVaultRegistryForCardBound
/// @author Vfide
contract MockVaultRegistryForCardBound {
    /// @notice isVaultMap
    mapping(address => bool) public isVaultMap;
    /// @notice guardianSetupCompleteMap
    mapping(address => bool) public guardianSetupCompleteMap;
    /// @notice shared intent validator used by directly deployed CardBoundVault instances
    address public intentValidator;
    /// @notice payment queue manager implementation for CardBoundVault EIP-1167 clones
    address public paymentQueueManagerImplementation;
    /// @notice withdrawal queue manager implementation for CardBoundVault EIP-1167 clones
    address public withdrawalQueueManagerImplementation;
    /// @notice inheritance manager implementation for CardBoundVault EIP-1167 clones
    address public inheritanceManagerImplementation;
    /// @notice admin manager implementation for CardBoundVault EIP-1167 clones
    address public adminManagerImplementation;

    /// @notice setVaultDependencies
    /// @param _intentValidator _intentValidator
    /// @param _paymentQueueManagerImplementation _paymentQueueManagerImplementation
    /// @param _withdrawalQueueManagerImplementation _withdrawalQueueManagerImplementation
    /// @param _inheritanceManagerImplementation _inheritanceManagerImplementation
    /// @param _adminManagerImplementation _adminManagerImplementation
    function setVaultDependencies(
        address _intentValidator,
        address _paymentQueueManagerImplementation,
        address _withdrawalQueueManagerImplementation,
        address _inheritanceManagerImplementation,
        address _adminManagerImplementation
    ) external {
        intentValidator = _intentValidator;
        paymentQueueManagerImplementation = _paymentQueueManagerImplementation;
        withdrawalQueueManagerImplementation = _withdrawalQueueManagerImplementation;
        inheritanceManagerImplementation = _inheritanceManagerImplementation;
        adminManagerImplementation = _adminManagerImplementation;
    }

    /// @notice setVault
    /// @param vault vault
    /// @param active active
    function setVault(address vault, bool active) external {
        isVaultMap[vault] = active;
    }

    /// @notice setGuardianSetupComplete
    /// @param vault vault
    /// @param complete complete
    function setGuardianSetupComplete(address vault, bool complete) external {
        guardianSetupCompleteMap[vault] = complete;
    }

    /// @notice isVault
    /// @param vault vault
    /// @return _bool _bool
    function isVault(address vault) external view returns (bool) {
        return isVaultMap[vault];
    }

    /// @notice guardianSetupComplete
    /// @param vault vault
    /// @return _bool _bool
    function guardianSetupComplete(address vault) external view returns (bool) {
        return guardianSetupCompleteMap[vault];
    }

    /// @notice invalidateGuardianSetup
    /// @param vault vault
    function invalidateGuardianSetup(address vault) external {
        guardianSetupCompleteMap[vault] = false;
    }
}

/// @notice MockVFIDEForCardBound
/// @title MockVFIDEForCardBound
/// @author Vfide
contract MockVFIDEForCardBound {
    /// @notice name
    string public constant name = "MockVFIDE";
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
        uint256 fromBalance = balanceOf[msg.sender];
        require(fromBalance >= amount, "insufficient");
        unchecked {
            balanceOf[msg.sender] = fromBalance - amount;
        }
        balanceOf[to] += amount;
        return true;
    }

    /// @notice transferFrom
    /// @param from from
    /// @param to to
    /// @param amount amount
    /// @return _bool _bool
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 fromBalance = balanceOf[from];
        require(fromBalance >= amount, "insufficient");
        unchecked {
            balanceOf[from] = fromBalance - amount;
        }
        balanceOf[to] += amount;
        return true;
    }
}
