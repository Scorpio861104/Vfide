// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract MockMerchantRebateVault {
    address public vfide;
    mapping(address => bool) public isManager;

    constructor(address _vfide) {
        vfide = _vfide;
    }

    function setManager(address manager, bool active) external {
        isManager[manager] = active;
    }

    function payRebate(address to, uint256 amount, string calldata reason) external {
        // Mock behavior: do nothing or emit event
    }
}
