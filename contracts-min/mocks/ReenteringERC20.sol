// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface ICommerceEscrow {
    function release(uint256 id) external;
    function refund(uint256 id) external;
}

contract ReenteringERC20 {
    string public name = "Reenter";
    string public symbol = "RNT";
    uint8 private _decimals = 18;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    address public reenterTarget;
    uint256 public reenterId;

    function setReenter(address target, uint256 id) external {
        reenterTarget = target;
        reenterId = id;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function transfer(address to, uint256 value) public returns (bool) {
        require(balanceOf[msg.sender] >= value, "balance");
        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;
        // attempt reentry into commerce escrow (unsafe if target is a contract)
        if (reenterTarget != address(0)) {
            // call release on reenter target - if it reverts, propagate
            ICommerceEscrow(reenterTarget).release(reenterId);
        }
        return true;
    }

    function approve(address spender, uint256 value) public returns (bool) {
        allowance[msg.sender][spender] = value;
        return true;
    }

    function transferFrom(address from, address to, uint256 value) public returns (bool) {
        require(balanceOf[from] >= value, "balance");
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= value, "allowance");
        allowance[from][msg.sender] = allowed - value;
        balanceOf[from] -= value;
        balanceOf[to] += value;
        return true;
    }

    function decimals() external view returns (uint8) { return _decimals; }
}
