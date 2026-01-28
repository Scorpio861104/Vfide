// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IMerchantRegistry_H {
    function addMerchant(address who) external;
    function merchants(address who) external view returns (uint8 strikes, uint32 refunds, uint32 disputes, uint8 status, uint32 lastUpdate);
    function TEST_autoSuspendThreshold() external view returns (uint32);
}

// Harness for merchant auto-suspend threshold enforcement.
// Assumptions: addMerchant callable; refunds/disputes updated via internal logic (not directly here).

contract EchidnaCommerceHarness {
    IMerchantRegistry_H public registry;
    uint32 public threshold;
    address public sampleMerchant;

    constructor(address reg) {
        registry = IMerchantRegistry_H(reg);
        threshold = registry.TEST_autoSuspendThreshold();
        sampleMerchant = address(0xA11CE);
        registry.addMerchant(sampleMerchant); // assume no revert in setup
    }

    // Property: A fresh merchant starts below suspend threshold and has status active (status == 1 maybe) or not suspended.
    function echidna_fresh_merchant_not_suspended() external view returns (bool) {
        (, uint32 refunds, uint32 disputes, uint8 status, ) = registry.merchants(sampleMerchant);
        bool below = (refunds + disputes) < threshold;
        // status code semantics: assume 0=NONE,1=ACTIVE,2=SUSPENDED. Accept ACTIVE only here.
        return below && status == 1;
    }
}
