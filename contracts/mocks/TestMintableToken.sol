// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @notice TestMintableToken
/// @title TestMintableToken
/// @author Vfide
contract TestMintableToken {
    /// @notice balanceOf
    mapping(address => uint256) public balanceOf;
    /// @notice allowance
    mapping(address => mapping(address => uint256)) public allowance;
    /// @notice totalSupply
    uint256 public totalSupply;

    /// @notice mint
    /// @param to to
    /// @param amount amount
    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
    }

    /// @notice transfer
    /// @param to to
    /// @param amount amount
    /// @return _bool _bool
    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    /// @notice transferFrom
    /// @param from from
    /// @param to to
    /// @param amount amount
    /// @return _bool _bool
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 currentAllowance = allowance[from][msg.sender];
        if (currentAllowance != type(uint256).max) {
            allowance[from][msg.sender] = currentAllowance - amount;
        }
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    /// @notice approve
    /// @param spender spender
    /// @param amount amount
    /// @return _bool _bool
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }
}