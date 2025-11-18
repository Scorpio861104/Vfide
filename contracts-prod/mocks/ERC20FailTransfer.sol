// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// ERC20 mock that supports minting/balances but ALWAYS returns false from transfer/transferFrom
contract ERC20FailTransfer {
    string public name = "FailTransfer";
    string public symbol = "FTF";
    uint8 public decimals = 18;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function mint(address to, uint256 amount) public {
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function transfer(address, uint256) public pure returns (bool) {
        return false;
    }

    function approve(address spender, uint256 value) public returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address, address, uint256) public pure returns (bool) {
        return false;
    }
}
