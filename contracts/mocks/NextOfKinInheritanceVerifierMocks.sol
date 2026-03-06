// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract MockVFIDEForInheritance {
    mapping(address => uint256) public balanceOf;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        uint256 fromBal = balanceOf[msg.sender];
        require(fromBal >= amount, "MOCK:insufficient");
        unchecked {
            balanceOf[msg.sender] = fromBal - amount;
        }
        balanceOf[to] += amount;
        return true;
    }

    function approve(address, uint256) external pure returns (bool) {
        return true;
    }
}

contract MockVaultHubForInheritance {
    mapping(address => address) public vaultOf;

    function setVault(address user, address vault) external {
        vaultOf[user] = vault;
    }
}
