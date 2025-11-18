// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "../VFIDEToken.sol";

contract TestVFIDEHarness is VFIDEToken {
    constructor(address devReserveVestingVault, address _vaultHub, address _ledger, address _treasurySink)
        VFIDEToken(devReserveVestingVault, _vaultHub, _ledger, _treasurySink)
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
