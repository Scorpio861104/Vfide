// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract MockToken {
    string public constant name = "Mock VFIDE";
    string public constant symbol = "mVFIDE";
    uint8 public constant decimals = 18;

    mapping(address => uint256) public balanceOf;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "insufficient");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract MockVaultHub {
    address public vault;

    constructor(address _vault) {
        vault = _vault;
    }

    function ensureVault(address) external view returns (address) {
        return vault;
    }
}

contract MockSecurityHub {
    bool public locked;

    function setLocked(bool value) external {
        locked = value;
    }

    function isLocked(address) external view returns (bool) {
        return locked;
    }
}

contract MockPresaleStart {
    uint256 public saleStartTime;

    constructor(uint256 _saleStartTime) {
        saleStartTime = _saleStartTime;
    }
}
