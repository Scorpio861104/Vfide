// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "../../../contracts/VFIDEPresale.sol";

contract VFIDEPresaleHarness is VFIDEPresale {
    constructor(
        address dao,
        address token,
        address treasury,
        address registry,
        uint256 saleStart
    ) VFIDEPresale(dao, token, treasury, registry, saleStart) {}

    function setEthContributed(address user, uint256 amount) external {
        ethContributed[user] = amount;
    }

    function setUsdContributed(address user, uint256 amount) external {
        usdContributed[user] = amount;
    }

    function setTotalEthRaised(uint256 amount) external {
        totalEthRaised = amount;
    }

    function setTotalUsdRaised(uint256 amount) external {
        totalUsdRaised = amount;
    }

    function setStableContributed(address user, address stablecoin, uint256 amount) external {
        stableContributed[user][stablecoin] = amount;
    }
}