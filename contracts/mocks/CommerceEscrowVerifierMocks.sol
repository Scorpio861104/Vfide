// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract MockSeerForEscrow {
    mapping(address => uint16) private _scores;
    mapping(address => uint256) public rewarded;
    mapping(address => uint256) public punished;

    function setScore(address account, uint16 score) external {
        _scores[account] = score;
    }

    function getScore(address account) external view returns (uint16) {
        return _scores[account];
    }

    function getCachedScore(address account) external view returns (uint16) {
        return _scores[account];
    }

    function reward(address subject, uint16 delta, string calldata) external {
        rewarded[subject] += delta;
    }

    function punish(address subject, uint16 delta, string calldata) external {
        punished[subject] += delta;
    }
}

contract MockTokenForEscrow {
    string public constant name = "Mock Escrow Token";
    string public constant symbol = "mESC";
    uint8 public constant decimals = 18;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function mint(address to, uint256 amount) external {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 currentAllowance = allowance[from][msg.sender];
        require(currentAllowance >= amount, "ERC20: insufficient allowance");
        unchecked {
            allowance[from][msg.sender] = currentAllowance - amount;
        }
        _transfer(from, to, amount);
        return true;
    }

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