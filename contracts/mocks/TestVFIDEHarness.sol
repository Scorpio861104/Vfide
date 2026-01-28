// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "../VFIDEToken.sol";

contract TestVFIDEHarness is VFIDEToken {
    constructor(
        address devReserveVestingVault,
        address presaleContract,
        address treasury,
        address vaultHub,
        address ledger,
        address treasurySink
    )
        VFIDEToken(devReserveVestingVault, presaleContract, treasury, vaultHub, ledger, treasurySink)
    {}

    // expose _mint for testing purposes
    function TEST_exposed_mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    // expose _transfer so tests can simulate edge cases (e.g., from==address(0))
    function TEST_expose_transfer(address from, address to, uint256 amount) external {
        _transfer(from, to, amount);
    }
}
