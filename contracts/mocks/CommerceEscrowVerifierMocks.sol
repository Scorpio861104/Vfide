// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @notice MockSeerForEscrow
/// @title MockSeerForEscrow
/// @author Vfide
contract MockSeerForEscrow {
    /// @notice _scores
    mapping(address => uint16) private _scores;
    /// @notice rewarded
    mapping(address => uint256) public rewarded;
    /// @notice punished
    mapping(address => uint256) public punished;

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

    /// @notice reward
    /// @param subject subject
    /// @param delta delta
    function reward(address subject, uint16 delta, string calldata) external {
        rewarded[subject] += delta;
    }

    /// @notice punish
    /// @param subject subject
    /// @param delta delta
    function punish(address subject, uint16 delta, string calldata) external {
        punished[subject] += delta;
    }
}

/// @notice MockTokenForEscrow
/// @title MockTokenForEscrow
/// @author Vfide
contract MockTokenForEscrow {
    /// @notice name
    string public constant name = "Mock Escrow Token";
    /// @notice symbol
    string public constant symbol = "mESC";
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