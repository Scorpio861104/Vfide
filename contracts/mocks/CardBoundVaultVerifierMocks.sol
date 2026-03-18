// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract MockVaultRegistryForCardBound {
    mapping(address => bool) public isVaultMap;

    function setVault(address vault, bool active) external {
        isVaultMap[vault] = active;
    }

    function isVault(address vault) external view returns (bool) {
        return isVaultMap[vault];
    }
}

contract MockVFIDEForCardBound {
    string public constant name = "MockVFIDE";
    string public constant symbol = "mVFIDE";
    uint8 public constant decimals = 18;

    mapping(address => uint256) public balanceOf;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        uint256 fromBalance = balanceOf[msg.sender];
        require(fromBalance >= amount, "insufficient");
        unchecked {
            balanceOf[msg.sender] = fromBalance - amount;
        }
        balanceOf[to] += amount;
        return true;
    }

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
