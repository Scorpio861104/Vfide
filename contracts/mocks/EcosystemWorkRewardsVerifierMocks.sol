// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @notice MockSeerForEcosystem
/// @title MockSeerForEcosystem
/// @author Vfide
contract MockSeerForEcosystem {
    /// @notice _scores
    mapping(address => uint16) private _scores;

    /// @notice setScore
    /// @param account account
    /// @param score score
    function setScore(address account, uint16 score) external {
        _scores[account] = score;
    }

    /// @notice getScore
    /// @param account account
    /// @return _uint16 _uint16
    function getScore(address account) external view returns (uint16) {
        return _scores[account];
    }

    /// @notice getCachedScore
    /// @param account account
    /// @return _uint16 _uint16
    function getCachedScore(address account) external view returns (uint16) {
        return _scores[account];
    }
}

/// @notice MockTokenForEcosystem
/// @title MockTokenForEcosystem
/// @author Vfide
contract MockTokenForEcosystem {
    /// @notice name
    string public constant name = "Mock VFIDE";
    /// @notice symbol
    string public constant symbol = "mVFIDE";
    /// @notice decimals
    uint8 public constant decimals = 18;

    /// @notice totalSupply
    uint256 public totalSupply;

    /// @notice balanceOf
    mapping(address => uint256) public balanceOf;
    /// @notice allowance
    mapping(address => mapping(address => uint256)) public allowance;

    /// @notice Transfer
    /// @param from from
    /// @param to to
    /// @param value value
    event Transfer(address indexed from, address indexed to, uint256 value);
    /// @notice Approval
    /// @param owner owner
    /// @param spender spender
    /// @param value value
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /// @notice mint
    /// @param to to
    /// @param amount amount
    function mint(address to, uint256 amount) external {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    /// @notice burn
    /// @param amount amount
    function burn(uint256 amount) external {
        uint256 accountBalance = balanceOf[msg.sender];
        require(accountBalance >= amount, "ERC20: burn exceeds balance");

        unchecked {
            balanceOf[msg.sender] = accountBalance - amount;
            totalSupply -= amount;
        }

        emit Transfer(msg.sender, address(0), amount);
    }

    /// @notice approve
    /// @param spender spender
    /// @param amount amount
    /// @return _bool _bool
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    /// @notice transfer
    /// @param to to
    /// @param amount amount
    /// @return _bool _bool
    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    /// @notice transferFrom
    /// @param from from
    /// @param to to
    /// @param amount amount
    /// @return _bool _bool
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 currentAllowance = allowance[from][msg.sender];
        require(currentAllowance >= amount, "ERC20: insufficient allowance");

        unchecked {
            allowance[from][msg.sender] = currentAllowance - amount;
        }

        _transfer(from, to, amount);
        return true;
    }

    /// @notice _transfer
    /// @param from from
    /// @param to to
    /// @param amount amount
    function _transfer(address from, address to, uint256 amount) internal {
        require(to != address(0), "ERC20: transfer to zero");
        uint256 fromBalance = balanceOf[from];
        require(fromBalance >= amount, "ERC20: transfer exceeds balance");

        unchecked {
            balanceOf[from] = fromBalance - amount;
        }
        balanceOf[to] += amount;

        emit Transfer(from, to, amount);
    }
}

/// @notice MockVaultHubForEcosystem
/// @title MockVaultHubForEcosystem
/// @author Vfide
contract MockVaultHubForEcosystem {
    /// @notice _vaults
    mapping(address => address) private _vaults;

    /// @notice setVault
    /// @param owner owner
    /// @param vault vault
    function setVault(address owner, address vault) external {
        _vaults[owner] = vault;
    }

    /// @notice vaultOf
    /// @param owner owner
    /// @return _address _address
    function vaultOf(address owner) external view returns (address) {
        return _vaults[owner];
    }
}